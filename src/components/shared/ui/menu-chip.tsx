import React from "react"
import { Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface MenuChipProps {
  label: string
  // Accessibility label for the trigger (the menu's purpose, e.g. "Sort")
  accessibilityLabel: string
  // A non-default choice is active — renders solid, like a selected FilterChip
  active?: boolean
}

// The trigger for a NativeMenu dropdown: current choice + chevron, in
// FilterChip's language (grey fill at rest, solid ink when a non-default
// choice is active). A plain View on purpose — NativeMenu owns the press.
const MenuChip = ({ label, accessibilityLabel, active = false }: MenuChipProps) => {
  const { baseColors, onPrimaryColors, controlFillBg } = useTheme()
  const color = getColor(active ? onPrimaryColors : baseColors)

  return (
    <View
      accessible
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: label }}
      className='flex-row items-center rounded-full px-3 py-1.5'
      style={{ gap: 2, backgroundColor: active ? getColor(baseColors) : controlFillBg }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color }}>{label}</Text>
      <MaterialCommunityIcons name='chevron-down' size={16} color={color} />
    </View>
  )
}

export default MenuChip
