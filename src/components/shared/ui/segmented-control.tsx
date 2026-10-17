import React from "react"
import { Pressable, Text, View } from "react-native"
import useTheme from "@/contexts/theme-context"

interface SegmentedOption<T> {
  label: string
  value: T
  testID?: string
  // Full color string (e.g. from getColor()) — colors the selected state's
  // text instead of the default ink
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

// iOS-style segmented control: a grey track with the selected segment(s) on a
// raised thumb, e.g. the voting form's seasons/gender/sillage/longevity pickers.
const SegmentedControl = <T extends string | number>({
  options,
  value,
  values,
  onChange,
  className,
}: SegmentedControlProps<T>) => {
  const { baseTextClass, mutedTextClass, controlFillBg, segmentThumbBg } = useTheme()

  return (
    <View
      className={`w-full flex-row rounded-xl p-0.5 ${className ?? ""}`}
      style={{ backgroundColor: controlFillBg, gap: 2 }}>
      {options.map((option) => {
        const selected = values ? values.includes(option.value) : option.value === value
        return (
          <Pressable
            key={String(option.value)}
            testID={option.testID}
            accessibilityRole='button'
            accessibilityState={{ selected }}
            className='flex-1 items-center justify-center rounded-[10px] px-1 py-2'
            style={
              selected
                ? {
                    backgroundColor: segmentThumbBg,
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : undefined
            }
            onPress={() => onChange(option.value)}>
            <Text
              numberOfLines={2}
              className={`text-center text-[12px] font-semibold ${selected ? baseTextClass : mutedTextClass}`}
              style={selected && option.tint ? { color: option.tint } : undefined}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default SegmentedControl
