import React, { type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import useTheme from "@/contexts/theme-context"

interface GlassCircleProps {
  // Used where Liquid Glass isn't available (Android, iOS < 26, web). A
  // complete class literal, same contract as IconButton's bgClassName
  fallbackBgClassName: string
  size?: "md" | "lg"
  dimmed?: boolean
  accessibilityLabel: string
  children: ReactNode
}

const liquidGlass = isLiquidGlassAvailable()

// Non-pressable circular icon surface with a Liquid Glass background — the
// trigger for NativeMenu, which owns the tap. For a plain tappable icon use
// IconButton instead.
const GlassCircle = ({
  fallbackBgClassName,
  size = "md",
  dimmed,
  accessibilityLabel,
  children,
}: GlassCircleProps) => {
  const { theme } = useTheme()
  const sizeClass = size === "lg" ? "h-12 w-12" : "h-11 w-11"

  return (
    <View
      className={`${liquidGlass ? "" : fallbackBgClassName} ${sizeClass} items-center justify-center rounded-full overflow-hidden ${dimmed ? "opacity-40" : ""}`}
      accessible
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!dimmed }}>
      {/* GlassView isn't a NativeWind-interop'd component, so it's styled
          with a plain style object and sits behind the icon */}
      {liquidGlass && <GlassView isInteractive colorScheme={theme} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  )
}

export default GlassCircle
