import React from "react"
import { TextInput, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface SearchFieldProps {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  autoFocus?: boolean
  onSubmitEditing?: () => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  testID?: string
}

// Pill search field — icon + input + conditional clear button. Shared by the
// collection list filter, catalog search, and FilterPickerModal's brand
// search so every text-search entry point in the app looks identical
// (previously the catalog/brand pickers used @rneui/themed's heavier
// SearchBar while the collection tab had its own hand-rolled version).
const SearchField = ({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  onSubmitEditing,
  onFocus,
  onBlur,
  className,
  testID,
}: SearchFieldProps) => {
  const { theme, baseColors, mutedColors } = useTheme()

  return (
    <View
      className={`flex-row items-center rounded-full px-3 ${
        theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"
      } ${className ?? ""}`}>
      <MaterialCommunityIcons name='magnify' size={20} color={getColor(mutedColors)} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={getColor(mutedColors)}
        autoCorrect={false}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType='search'
        testID={testID}
        className='flex-1 px-2 py-2.5'
        style={{ color: getColor(baseColors) }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")} hitSlop={8}>
          <MaterialCommunityIcons name='close-circle' size={18} color={getColor(mutedColors)} />
        </TouchableOpacity>
      )}
    </View>
  )
}

export default SearchField
