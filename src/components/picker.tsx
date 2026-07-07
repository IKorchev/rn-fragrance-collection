import React, { useEffect, useRef, useState } from "react"
import * as Haptics from "expo-haptics"
import { View, Text, Image, StyleSheet, Animated, Easing, PanResponder } from "react-native"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useAuth, { type UserFragrance } from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import { pickWeightedIndex } from "@/lib/utils/pick-weighted-index"
import { isWornToday } from "@/lib/utils/worn-today"
import { getImageSource } from "@/lib/utils/image-source"
import Card from "./card"

interface PickerProps {
  fragrance: UserFragrance | undefined
  index: number | undefined
}

const Picker = ({ fragrance, index }: PickerProps) => {
  const { incrementWear, userCollection, getNewFrag } = useAuth()
  const { theme, baseBorderClass, mutedTextClass } = useTheme()
  const animatedOffset = useRef(new Animated.Value(0)).current
  const animationLoopRef = useRef<Animated.CompositeAnimation | null>(null)
  // "settling" = main spin done, overshoot spring still bouncing — the reel is
  // already on the target card, so UI (wear button) treats it as landed
  const [spinPhase, setSpinPhase] = useState<"idle" | "spinning" | "settling">("idle")
  const isSpinning = spinPhase !== "idle"
  const [spinIndex, setSpinIndex] = useState(index ?? 0)
  const currentItem = userCollection[spinIndex]
  const reelItems = userCollection.length
    ? Array.from({ length: userCollection.length * 12 }, (_, offset) => {
        return userCollection[offset % userCollection.length]
      })
    : []
  const [containerHeight, setContainerHeight] = useState(288) // measured via onLayout, 288 (h-72) until then
  // Each reel card fills the whole window (exactly one visible at a time), so
  // the translateY that centers card `i` is simply -i * cardHeight
  const offsetForIndex = (i: number) => -i * containerHeight

  useEffect(() => {
    if (typeof index === "number" && userCollection[index]) {
      setSpinIndex(index)
    } else if (userCollection.length) {
      setSpinIndex(Math.min(spinIndex, userCollection.length - 1))
    }
  }, [index, userCollection.length])

  useEffect(() => {
    if (!isSpinning && fragrance?.id && userCollection.length) {
      const matchedIndex = userCollection.findIndex((el) => el.id === fragrance.id)
      if (matchedIndex >= 0) {
        setSpinIndex(matchedIndex)
      }
    }
  }, [fragrance?.id, isSpinning, userCollection])

  useEffect(() => {
    if (!isSpinning) {
      animatedOffset.setValue(offsetForIndex(spinIndex))
    }
  }, [spinIndex, isSpinning, containerHeight])

  useEffect(() => {
    return () => {
      if (animationLoopRef.current) {
        animationLoopRef.current.stop()
      }
    }
  }, [])

  const handleReroll = () => {
    if (!userCollection.length) return

    if (animationLoopRef.current) {
      animationLoopRef.current.stop()
    }

    const count = userCollection.length
    const startIndex = spinIndex % count
    const targetIndex = pickWeightedIndex(userCollection)
    const extraSpins = 3 + Math.floor(Math.random() * 3)
    const stepsToTarget = (targetIndex - startIndex + count) % count
    const totalSteps = extraSpins * count + stepsToTarget
    // endIndex < 7 * count, always within the 12 * count items rendered in the reel
    const endIndex = startIndex + totalSteps

    setSpinPhase("spinning")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    animatedOffset.setValue(offsetForIndex(startIndex))

    // Slot-machine settle: overshoot the final card slightly, then spring back.
    // Run the two stages separately (not Animated.sequence) so state can flip
    // to "settling" the moment the main spin lands — waiting for the spring's
    // finished callback held the wear button back well past the visual stop
    const spin = Animated.timing(animatedOffset, {
      toValue: offsetForIndex(endIndex) - containerHeight * (0.12 + Math.min(Math.random(), 0.6)),
      duration: 1000 + totalSteps * 38,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    })
    const settle = Animated.spring(animatedOffset, {
      toValue: offsetForIndex(endIndex),
      friction: 5,
      tension: 70,
      // Default rest thresholds (0.001px) keep the spring "running" long after
      // it looks settled — sub-pixel rest is good enough to unlock the lever
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      useNativeDriver: true,
    })

    animationLoopRef.current = spin
    spin.start(({ finished }) => {
      if (!finished) return
      setSpinIndex(targetIndex)
      setSpinPhase("settling")
      // The reel visually lands here — the thunk sells the slot machine
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      getNewFrag(targetIndex)
      animationLoopRef.current = settle
      settle.start(({ finished: settled }) => {
        if (!settled) return
        animatedOffset.setValue(offsetForIndex(targetIndex))
        setSpinPhase("idle")
      })
    })
  }

  // Latest-value refs so the PanResponder (created once) never sees stale state
  const handleRerollRef = useRef(handleReroll)
  handleRerollRef.current = handleReroll
  const isSpinningRef = useRef(isSpinning)
  isSpinningRef.current = isSpinning

  // Slot-machine arm: drag the knob down the track; releasing past ~55% of the
  // travel fires a spin, either way the knob springs back up (JS-driven — the
  // value is set imperatively from the gesture, so it can't be native-driven)
  const leverTravel = 120
  const leverY = useRef(new Animated.Value(0)).current
  const leverDragRef = useRef(0)
  const resetLever = () => {
    leverDragRef.current = 0
    Animated.spring(leverY, {
      toValue: 0,
      friction: 4,
      useNativeDriver: false,
    }).start()
  }
  const leverResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSpinningRef.current,
      onMoveShouldSetPanResponder: (_e, gesture) =>
        !isSpinningRef.current && Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_e, gesture) => {
        const clamped = Math.min(Math.max(gesture.dy, 0), leverTravel)
        leverDragRef.current = clamped
        leverY.setValue(clamped)
      },
      onPanResponderRelease: () => {
        const pulled = leverDragRef.current >= leverTravel * 0.55
        resetLever()
        if (pulled) handleRerollRef.current()
      },
      onPanResponderTerminate: () => resetLever(),
    })
  ).current

  return (
    <View className='w-full items-center py-12'>
      <View className='flex-row h-full -mb-32 items-center justify-center'>
        <View className={`w-2/3 aspect-square rounded-xl overflow-hidden border ${baseBorderClass}`}>
          {currentItem ? (
            <View
              className={`flex-1 ${theme === "dark" ? "bg-white/5" : "bg-black/5"}`}
              onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
            >
              <Animated.View
                className='absolute inset-x-0 top-0'
                style={{ transform: [{ translateY: animatedOffset }] }}
              >
                {reelItems.map((item, itemIndex) => {
                  const imageSource = getImageSource(item?.image_url)
                  // "Brand - Title" convention; names without it show as title only
                  const nameParts = (item?.name ?? "").split(" - ")
                  const title = nameParts[1] ?? nameParts[0]
                  const brand = nameParts[1] ? nameParts[0] : ""

                  return (
                    <View
                      key={`${item?.id ?? "slot"}-${itemIndex}`}
                      style={{ height: containerHeight }}
                      className='w-full'
                    >
                      {imageSource ? (
                        // White backing keeps product shots (white backgrounds)
                        // from clashing in dark mode
                        <View className='absolute inset-0 items-center justify-center bg-white'>
                          <Image
                            className='h-full w-full'
                            resizeMode='cover'
                            source={imageSource}
                          />
                        </View>
                      ) : (
                        <View className='absolute inset-0 items-center justify-center'>
                          <MaterialCommunityIcons
                            name='image-off'
                            size={40}
                            color={getColor(theme === "dark" ? "neutral-600" : "neutral-400")}
                          />
                        </View>
                      )}

                   
                      <Card.Overlay>
                          <Card.Title color='white'>{title}</Card.Title>
                          <Card.Subtitle color='white'>{brand}</Card.Subtitle>
                          <Card.WearInfoText color='white' timesWorn={item?.times_worn ?? 0} lastWorn={item?.last_worn} />
                      </Card.Overlay>
                    </View>
                  )
                })}
              </Animated.View>
              {/* Wear button overlaid on the current card's info strip — hidden
                  mid-spin so you can't wear a card whizzing by, but shown while
                  the settle spring bounces (the target card is already landed).
                  Dimmed once worn today (one wear per day) — still tappable,
                  the increment_wear round-trip shows the "already worn" toast */}
              {spinPhase !== "spinning" && (
                <Card.ActionButton
                  variant='wear'
                  size='lg'
                  className='absolute bottom-2.5 right-2.5'
                  style={styles.knob}
                  dimmed={isWornToday(currentItem.last_worn)}
                  onPress={() => incrementWear({ id: currentItem.id })}>
                  {(iconColor) => <FontAwesome5 name='spray-can' size={22} color={iconColor} />}
                </Card.ActionButton>
              )}
            </View>
          ) : (
            <View className='flex-1 items-center justify-center'>
              <Text className={`${mutedTextClass}`}>No fragrances yet</Text>
            </View>
          )}
        </View>
        {/* Slot-machine arm — drag the knob down and release to spin */}
        <View className='ml-5 h-60 w-12 items-center'>
          <View
            className={`absolute top-1 bottom-1 w-1.5 rounded-full ${theme === "dark" ? "bg-white/15" : "bg-black/10"}`}
          />
          <Animated.View
            {...leverResponder.panHandlers}
            style={{ transform: [{ translateY: leverY }] }}
            className='mt-1 items-center justify-center'
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <View
              className='h-11 w-11 rounded-full bg-red-500 border-2 border-red-700'
              style={styles.knob}
            >
              <View className='absolute left-2 top-2 h-3 w-3 rounded-full bg-red-300' />
            </View>
          </Animated.View>
          <Text className={`${mutedTextClass} absolute -bottom-6 text-xs`}>Pull</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  knob: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
})

export default Picker
