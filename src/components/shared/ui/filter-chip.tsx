import React from "react"
import { Chip } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface FilterChipProps {
  label: string
  selected: boolean
  onPress: () => void
  testID?: string
  // search.tsx's brand-filter chip uses 14 instead of the default 12
  paddingHorizontal?: number
}

// Selectable pill chip — brand filter, sort options, wear-period selector.
// iOS-style: grey control fill at rest, solid ink (inverted text) when selected.
// None of this is className, so it's unaffected by NativeWind's literal-scan
// constraint; colors come straight from useTheme()'s bare tokens.
const FilterChip = ({ label, selected, onPress, testID, paddingHorizontal = 12 }: FilterChipProps) => {
  const { baseColors, onPrimaryColors, controlFillBg } = useTheme()

  return (
    <Chip
      testID={testID}
      type='solid'
      containerStyle={{ borderRadius: 9999 }}
      buttonStyle={{
        paddingHorizontal,
        borderRadius: 9999,
        backgroundColor: selected ? getColor(baseColors) : controlFillBg,
      }}
      titleStyle={{
        fontSize: 13,
        fontWeight: "600",
        color: selected ? getColor(onPrimaryColors) : getColor(baseColors),
      }}
      title={label}
      onPress={onPress}
      accessibilityState={{ selected, disabled: false }}
    />
  )
}

export default FilterChip
