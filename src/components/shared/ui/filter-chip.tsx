import React from "react"
import { Chip } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface FilterChipProps {
  label: string
  selected: boolean
  onPress: () => void
  // search.tsx's brand-filter chip uses 14 instead of the default 12
  paddingHorizontal?: number
}

// Selectable pill chip — brand filter, sort options, wear-period selector.
// None of this is className, so it's unaffected by NativeWind's literal-scan
// constraint; colors come straight from useTheme()'s bare tokens.
const FilterChip = ({ label, selected, onPress, paddingHorizontal = 12 }: FilterChipProps) => {
  const { accentColors, cardBorderColors, mutedColors, accentTintBg } = useTheme()

  return (
    <Chip
      type='outline'
      containerStyle={{
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: selected ? getColor(accentColors) : getColor(cardBorderColors),
        backgroundColor: selected ? accentTintBg : undefined,
      }}
      buttonStyle={{ paddingHorizontal, borderRadius: 9999 }}
      titleStyle={{
        fontSize: 13,
        fontWeight: "600",
        color: selected ? getColor(accentColors) : getColor(mutedColors),
      }}
      title={label}
      onPress={onPress}
    />
  )
}

export default FilterChip
