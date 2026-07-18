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
  size?: "md" | "sm"
}

// Bordered grid of centered value/label tiles with hairline dividers —
// profile's 2×2 stats block, wear-history's totals row.
const StatTile = ({ items, columns = items.length, className, size = "md" }: StatTileProps) => {
  const { accentTextClass, mutedTextClass, baseBorderClass, cardBorderColors } = useTheme()

  const rows: StatItem[][] = []
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns))

  const cellPaddingClass = size === "sm" ? "py-3" : "py-4"
  const valueClass = size === "sm" ? `${accentTextClass} text-base font-bold` : `${accentTextClass} text-2xl font-bold`
  const labelClass = size === "sm" ? `${mutedTextClass} text-xs pt-0.5` : `${mutedTextClass} text-sm pt-1`

  return (
    <View className={`w-full rounded-2xl border ${baseBorderClass} ${className ?? ""}`}>
      {rows.map((rowItems, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {rowIndex > 0 && <View style={{ height: 1, backgroundColor: getColor(cardBorderColors) }} />}
          <View className='flex-row'>
            {rowItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <View style={{ width: 1, backgroundColor: getColor(cardBorderColors) }} />}
                <View className={`flex-1 items-center ${cellPaddingClass}`}>
                  <Text className={valueClass}>{item.value}</Text>
                  <Text className={labelClass}>{item.label}</Text>
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
