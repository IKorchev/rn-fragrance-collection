import React, { type ReactNode } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface RowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  // Omit for a non-pressable row (e.g. one that just holds a Switch)
  onPress?: () => void
  // Overrides the default chevron — e.g. a Switch
  trailing?: ReactNode
  // "accent" = tinted background, no border, accent-colored icon/label/chevron
  // (profile's "Upgrade to Pro" row) — default "base" is the bordered/neutral look
  tone?: "base" | "accent"
  // Margin is intentionally not baked in — every call site's spacing differs
  // (most rows use mt-4, the accent upgrade row uses mt-6)
  className?: string
  testID?: string
}

// Icon + label + trailing-accessory row — profile's settings list.
const Row = ({ icon, label, onPress, trailing, tone = "base", className, testID }: RowProps) => {
  const { baseTextClass, accentTextClass, baseBorderClass, mutedColors, accentColors, accentTintBg } =
    useTheme()
  const iconColor = getColor(tone === "accent" ? accentColors : mutedColors)
  const labelClass = tone === "accent" ? accentTextClass : baseTextClass
  const containerClass = `flex-row items-center w-full px-4 py-3 rounded-2xl ${tone === "base" ? `border ${baseBorderClass}` : ""} ${className ?? ""}`
  const style = tone === "accent" ? { backgroundColor: accentTintBg } : undefined

  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text className={`${labelClass} text-base font-semibold pl-3 flex-1`}>{label}</Text>
      {trailing ?? (onPress && <MaterialCommunityIcons name='chevron-right' size={22} color={iconColor} />)}
    </>
  )

  if (!onPress) {
    return (
      <View testID={testID} className={containerClass} style={style}>
        {content}
      </View>
    )
  }

  return (
    <TouchableOpacity testID={testID} onPress={onPress} className={containerClass} style={style}>
      {content}
    </TouchableOpacity>
  )
}

export default Row
