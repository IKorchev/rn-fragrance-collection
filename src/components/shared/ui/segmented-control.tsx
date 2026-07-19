import React from "react"
import { Pressable, Text, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface SegmentedOption<T> {
  label: string
  value: T
  testID?: string
  // Full color string (e.g. from getColor()) — colors the selected state's
  // text and (with alpha appended) background instead of the accent
  tint?: string
}

interface SegmentedControlProps<T> {
  options: SegmentedOption<T>[]
  // Single-select: pass `value`. Multi-select: pass `values` instead —
  // onChange still fires the tapped value and the caller owns toggle logic.
  value?: T | null
  values?: T[]
  onChange: (value: T) => void
  className?: string
}

// Joined button group on one row — [a|b|c|d|e] with hairline dividers,
// e.g. the voting form's seasons/gender/sillage/longevity pickers.
const SegmentedControl = <T extends string | number>({
  options,
  value,
  values,
  onChange,
  className,
}: SegmentedControlProps<T>) => {
  const { theme, accentTextClass, mutedTextClass, baseBorderClass, cardBorderColors, accentTintBg } = useTheme()
  const tintAlpha = theme === "dark" ? "26" : "1a"

  return (
    <View className={`w-full flex-row overflow-hidden rounded-2xl border ${baseBorderClass} ${className ?? ""}`}>
      {options.map((option, index) => {
        const selected = values ? values.includes(option.value) : option.value === value
        return (
          <React.Fragment key={String(option.value)}>
            {index > 0 && <View style={{ width: 1, backgroundColor: getColor(cardBorderColors) }} />}
            <Pressable
              testID={option.testID}
              accessibilityRole='button'
              accessibilityState={{ selected }}
              className='flex-1 items-center justify-center px-1 py-2.5'
              style={
                selected ? { backgroundColor: option.tint ? option.tint + tintAlpha : accentTintBg } : undefined
              }
              onPress={() => onChange(option.value)}>
              <Text
                numberOfLines={2}
                className={`text-center text-[11px] font-semibold ${selected ? accentTextClass : mutedTextClass}`}
                style={selected && option.tint ? { color: option.tint } : undefined}>
                {option.label}
              </Text>
            </Pressable>
          </React.Fragment>
        )
      })}
    </View>
  )
}

export default SegmentedControl
