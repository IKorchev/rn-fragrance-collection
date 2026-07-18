import React, { useEffect } from "react"
import { View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import useTheme from "@/contexts/theme-context"

interface SkeletonListProps {
  // How many placeholder rows to render (roughly one screenful by default)
  count?: number
}

// Pulsing card-shaped placeholders shown while a list query loads — sized to
// match Card.Root rows (84px tall, 12px gutter) so content doesn't jump when
// real rows replace them.
const SkeletonList = ({ count = 7 }: SkeletonListProps) => {
  const { theme } = useTheme()
  const pulse = useSharedValue(0.5)

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true)
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))
  const blockClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"

  return (
    <View className='pt-1'>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          style={pulseStyle}
          className={`mx-3 my-1 h-[84px] flex-row items-center rounded-2xl px-3 ${
            theme === "dark" ? "bg-zinc-900" : "bg-white"
          }`}>
          <View className={`h-14 w-14 rounded-xl ${blockClass}`} />
          <View className='flex-1 pl-3'>
            <View className={`h-4 w-3/5 rounded-md ${blockClass}`} />
            <View className={`mt-2 h-3 w-2/5 rounded-md ${blockClass}`} />
            <View className={`mt-2 h-3 w-1/2 rounded-md ${blockClass}`} />
          </View>
        </Animated.View>
      ))}
    </View>
  )
}

export default SkeletonList
