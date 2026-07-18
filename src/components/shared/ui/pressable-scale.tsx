import React, { type ReactNode } from "react"
import { Pressable, type StyleProp, type ViewStyle, type Insets } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"

interface PressableScaleProps {
  onPress: () => void
  disabled?: boolean
  hitSlop?: Insets | number
  className?: string
  style?: StyleProp<ViewStyle>
  testID?: string
  children: ReactNode
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Pressable that springs to 96% while held — the tactile press feedback for
// pills, buttons, and FABs (replaces TouchableOpacity's plain fade).
const PressableScale = ({
  onPress,
  disabled,
  hitSlop,
  className,
  style,
  testID,
  children,
}: PressableScaleProps) => {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 20, stiffness: 400 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 400 })
      }}
      className={className}
      style={[animatedStyle, style]}
      testID={testID}>
      {children}
    </AnimatedPressable>
  )
}

export default PressableScale
