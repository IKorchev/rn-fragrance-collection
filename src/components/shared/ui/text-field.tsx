import React from "react"
import { TextInput } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface TextFieldProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  multiline?: boolean
  onBlur?: () => void
  onEndEditing?: () => void
  autoCorrect?: boolean
  maxLength?: number
  rounded?: "xl" | "2xl"
  // Caller-supplied complete literal, e.g. "min-h-[96px]"
  minHeightClass?: string
  className?: string
  testID?: string
}

// Plain themed text input — manual-add's brand/title fields, fragrance-detail's
// notes textarea, moderation's reject note. Not for the rneui SearchBar usages
// or the collection screen's icon+clear-button search pill (different shape,
// single call site each — not worth folding in here).
const TextField = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  onBlur,
  onEndEditing,
  autoCorrect = true,
  maxLength,
  rounded = "2xl",
  minHeightClass,
  className,
  testID,
}: TextFieldProps) => {
  const { theme, baseColors, mutedColors } = useTheme()
  const inputBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"
  const roundedClass = rounded === "xl" ? "rounded-xl" : "rounded-2xl"

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={getColor(mutedColors)}
      autoCorrect={autoCorrect}
      multiline={multiline}
      onBlur={onBlur}
      onEndEditing={onEndEditing}
      maxLength={maxLength}
      testID={testID}
      className={`${roundedClass} px-4 py-3 ${inputBgClass} ${minHeightClass ?? ""} ${className ?? ""}`}
      style={{ color: getColor(baseColors), ...(multiline ? { textAlignVertical: "top" as const } : {}) }}
    />
  )
}

export default TextField
