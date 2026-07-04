import React, { useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import { getColor } from "../lib/utils/colors"
import ReelImage from "./ReelImage"
import useAuth from "../Contexts/AuthContext"
import useTheme from "../Contexts/ThemeContext"
import useData from "../Contexts/DataContext"

const Picker = ({ fragrance, index }) => {
  const { incrementWear, userCollection } = useAuth()
  const { getNewFrag } = useData()
  const { viewColors } = useTheme()
  const animatedOffset = useRef(new Animated.Value(0)).current
  const animationLoopRef = useRef(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinIndex, setSpinIndex] = useState(index ?? 0)
  const currentItem = userCollection[spinIndex]
  const reelItems = userCollection.length
    ? Array.from({ length: userCollection.length * 12 }, (_, offset) => {
        return userCollection[offset % userCollection.length]
      })
    : []
  const reelHeight = 56
  const [containerHeight, setContainerHeight] = useState(288) // measured via onLayout, 288 (h-72) until then
  // translateY that puts reel item `i` in the vertical center of the container
  const offsetForIndex = (i) => (containerHeight - reelHeight) / 2 - i * reelHeight

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
    const targetIndex = Math.floor(Math.random() * count)
    const extraSpins = 3 + Math.floor(Math.random() * 3)
    const stepsToTarget = (targetIndex - startIndex + count) % count
    const totalSteps = extraSpins * count + stepsToTarget
    // endIndex < 7 * count, always within the 12 * count items rendered in the reel
    const endIndex = startIndex + totalSteps

    setIsSpinning(true)
    animatedOffset.setValue(offsetForIndex(startIndex))

    animationLoopRef.current = Animated.timing(animatedOffset, {
      toValue: offsetForIndex(endIndex),
      duration: 1000 + totalSteps * 38,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    })

    animationLoopRef.current.start(({ finished }) => {
      if (!finished) return
      animatedOffset.setValue(offsetForIndex(targetIndex))
      setSpinIndex(targetIndex)
      setIsSpinning(false)
      getNewFrag(targetIndex)
    })
  }

  return (
    <View className='h-full w-full items-center py-12'>
      <Text className={`${viewColors.font} text-4xl font-bold`}>{isSpinning ? "Spinning..." : "Your pick"}</Text>
      <View className='h-72 w-60 rounded-xl overflow-hidden border border-white/40' style={styles.dice}>
        {currentItem ? (
          <View
            className='flex-1 bg-black/5'
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
            <View style={{ height: 100 }} className='absolute inset-x-0 top-0 z-10 bg-black/50' />
            <View style={{ height: 100 }} className='absolute inset-x-0 bottom-0 z-10 bg-black/50' />
            <Animated.View
              className='absolute inset-x-0 top-0'
              style={{ transform: [{ translateY: animatedOffset }] }}>
              {reelItems.map((item, index) => (
                <View
                  key={`${item?.id ?? "slot"}-${index}`}
                  style={{ height: reelHeight }}
                  className='w-full items-center justify-center px-2'>
                  <Text numberOfLines={1} className={`${viewColors.font} text-center text-sm font-semibold`}>
                    {item?.name ?? ""}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
        ) : (
          <View className='flex-1 items-center justify-center'>
            <Text className={`${viewColors.font}`}>No fragrances yet</Text>
          </View>
        )}
      </View>
      <View className='mt-12 flex-row'>
        <View className='items-center'>
          <Text className={`${viewColors.font} items-center mb-2 text-lg`}>Wear</Text>
          <TouchableOpacity
            onPress={() => incrementWear(fragrance)}
            className='p-3 h-16 w-16 mx-12 items-center justify-center bg-green-200 rounded-full'>
            <FontAwesome5 name='spray-can' size={30} color={getColor("green-900")} />
          </TouchableOpacity>
        </View>
        <View className='items-center'>
          <Text className={`${viewColors.font} items-center mb-2 text-lg`}>Reroll</Text>
          <TouchableOpacity
            onPress={handleReroll}
            disabled={isSpinning}
            className='p-3 h-16 w-16 mx-12 items-center justify-center bg-red-200 rounded-full'>
            <MaterialCommunityIcons name='dice-multiple' size={40} color={getColor("red-900")} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dice: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.39,
    shadowRadius: 22.3,
  },
})

export default Picker
