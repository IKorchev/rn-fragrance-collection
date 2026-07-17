import React, { type ReactNode } from "react"
import { type StyleProp, type ViewStyle } from "react-native"
import PressableScale from "./pressable-scale"

interface IconButtonProps {
  // Caller-supplied complete literal (e.g. a theme.buttons.*Bg field, or
  // theme.primaryBg) — this component never derives colors itself
  bgClassName: string
  size?: "md" | "lg" | "xl"
  dimmed?: boolean
  onPress: () => void
  className?: string
  style?: StyleProp<ViewStyle>
  testID?: string
  children: ReactNode
}

// Generic circular icon button — Card.ActionButton (src/components/card.tsx)
// wraps this with its wear/edit/delete/reroll color mapping; use this
// directly for anything outside that domain (e.g. the collection FAB).
const IconButton = ({
  bgClassName,
  size = "md",
  dimmed,
  onPress,
  className,
  style,
  testID,
  children,
}: IconButtonProps) => {
  const sizeClass = size === "xl" ? "h-14 w-14" : size === "lg" ? "h-12 w-12" : "h-11 w-11"

  return (
    <PressableScale
      className={`${bgClassName} ${sizeClass} justify-center rounded-full items-center ${dimmed ? "opacity-40" : ""} ${className ?? ""}`}
      style={style}
      testID={testID}
      onPress={onPress}>
      {children}
    </PressableScale>
  )
}

export default IconButton
