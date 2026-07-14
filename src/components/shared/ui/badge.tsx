import React from "react"
import { Text, View } from "react-native"
import useTheme from "@/contexts/theme-context"

interface BadgeProps {
  label: string
}

// Small tinted pill label — profile's "PRO" tag.
const Badge = ({ label }: BadgeProps) => {
  const { accentTextClass, accentTintBg } = useTheme()

  return (
    <View className='px-2 py-0.5 rounded-full' style={{ backgroundColor: accentTintBg }}>
      <Text className={`${accentTextClass} text-xs font-bold`}>{label}</Text>
    </View>
  )
}

export default Badge
