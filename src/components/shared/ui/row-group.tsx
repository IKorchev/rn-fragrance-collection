import React, { createContext, type ReactNode } from "react"
import { Text, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

// Read by Row so rows inside a group drop their own border/rounding without
// every call site having to pass a `grouped` prop.
export const RowGroupContext = createContext(false)

interface RowGroupProps {
  title?: string
  children: ReactNode
  className?: string
}

// Settings-style section: muted caption above one bordered card holding Rows
// separated by hairlines. The hairline inset (48 = px-4 + icon + pl-3) aligns
// separators with the label column, iOS-style.
const RowGroup = ({ title, children, className }: RowGroupProps) => {
  const { mutedTextClass, baseBorderClass, cardBorderColors } = useTheme()
  const rows = React.Children.toArray(children)

  return (
    <View className={`w-full ${className ?? ""}`}>
      {title && (
        <Text className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider pb-2 pl-1`}>
          {title}
        </Text>
      )}
      <View className={`rounded-2xl border ${baseBorderClass} overflow-hidden`}>
        <RowGroupContext.Provider value={true}>
          {rows.map((row, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <View style={{ height: 1, marginLeft: 48, backgroundColor: getColor(cardBorderColors) }} />
              )}
              {row}
            </React.Fragment>
          ))}
        </RowGroupContext.Provider>
      </View>
    </View>
  )
}

export default RowGroup
