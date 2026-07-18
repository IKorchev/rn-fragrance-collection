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
  // Wraps items into a grid (e.g. 4 items + columns={2} = a 2×2 tile);
  // default keeps everything on one row
  columns?: number
  className?: string
}

// Bordered grid of centered value/label tiles with hairline dividers —
// profile's 2×2 stats block, wear-history's totals row.
const StatTile = ({ items, columns = items.length, className }: StatTileProps) => {
  const { accentTextClass, mutedTextClass, baseBorderClass, cardBorderColors } = useTheme()

  const rows: StatItem[][] = []
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns))

  return (
    <View className={`w-full rounded-2xl border ${baseBorderClass} ${className ?? ""}`}>
      {rows.map((rowItems, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {rowIndex > 0 && <View style={{ height: 1, backgroundColor: getColor(cardBorderColors) }} />}
          <View className='flex-row'>
            {rowItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <View style={{ width: 1, backgroundColor: getColor(cardBorderColors) }} />}
                <View className='flex-1 items-center py-4'>
                  <Text className={`${accentTextClass} text-2xl font-bold`}>{item.value}</Text>
                  <Text className={`${mutedTextClass} text-sm pt-1`}>{item.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </React.Fragment>
      ))}
    </View>
  )
}

export default StatTile
