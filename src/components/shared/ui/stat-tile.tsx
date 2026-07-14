import React from "react"
import { Text, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface StatItem {
  value: string | number
  label: string
}

interface StatTileProps {
  items: StatItem[]
  className?: string
}

// Bordered row of centered value/label tiles with hairline dividers between
// them — profile's collection/wears and month/streak stat pairs.
const StatTile = ({ items, className }: StatTileProps) => {
  const { accentTextClass, mutedTextClass, baseBorderClass, cardBorderColors } = useTheme()

  return (
    <View className={`flex-row w-full rounded-2xl border ${baseBorderClass} ${className ?? ""}`}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <View style={{ width: 1, backgroundColor: getColor(cardBorderColors) }} />}
          <View className='flex-1 items-center py-4'>
            <Text className={`${accentTextClass} text-2xl font-bold`}>{item.value}</Text>
            <Text className={`${mutedTextClass} text-sm pt-1`}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  )
}

export default StatTile
