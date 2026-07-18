import React from "react"
import { Modal, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { type PickerFilters, pickerFiltersActive } from "@/lib/utils/picker-filters"
import type { Facet } from "@/lib/utils/collection-facets"
import FilterChip from "@/components/shared/ui/filter-chip"
import Button from "@/components/shared/ui/button"

interface PickerFilterSheetProps {
  visible: boolean
  filters: PickerFilters
  tagFacets: Facet[]
  brandFacets: Facet[]
  onChange: (filters: PickerFilters) => void
  onClose: () => void
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

// Pro feature (src/lib/entitlements.ts) — narrows the picker's weighted
// candidate pool by tag/brand/unworn without touching the weighting math
// itself (see AuthContext.pickerPool). Gated at the call site (picker.tsx):
// this component assumes it's only ever opened for a Pro user.
const PickerFilterSheet = ({
  visible,
  filters,
  tagFacets,
  brandFacets,
  onChange,
  onClose,
}: PickerFilterSheetProps) => {
  const { modalColors, baseTextClass, mutedTextClass, accentTextClass, baseBorderClass, theme } =
    useTheme()

  const setFilters = (next: Partial<PickerFilters>) => onChange({ ...filters, ...next })

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={onClose}>
      <View className={`${modalColors.background} flex-1`}>
        <View className={`${baseBorderClass} flex-row items-center justify-between px-4 pt-4 pb-2 border-b`}>
          <Text className={`${baseTextClass} text-lg font-bold`}>Filter picker</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} testID='picker-filter-done'>
            <Text className={`${accentTextClass} text-base font-semibold`}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerClassName='px-4 pt-4 pb-10' showsVerticalScrollIndicator={false}>
          {pickerFiltersActive(filters) && (
            <TouchableOpacity
              className='pb-3'
              onPress={() => onChange({ tags: [], brands: [], unwornOnly: false })}>
              <Text className={`${accentTextClass} font-semibold`}>Clear all filters</Text>
            </TouchableOpacity>
          )}

          <View
            className={`flex-row items-center justify-between rounded-2xl border ${baseBorderClass} px-4 py-3`}>
            <Text className={`${baseTextClass} text-base font-semibold flex-1 pr-3`}>
              Only fragrances I haven't worn yet
            </Text>
            <Switch
              value={filters.unwornOnly}
              onValueChange={(value) => setFilters({ unwornOnly: value })}
              trackColor={{ true: getColor(theme === "dark" ? "emerald-500" : "emerald-600") }}
              testID='picker-filter-unworn-switch'
            />
          </View>

          {tagFacets.length > 0 && (
            <>
              <Text className={`${mutedTextClass} text-sm font-semibold pt-6 pb-2`}>
                Tags (any of)
              </Text>
              <View className='flex-row flex-wrap' style={{ gap: 8 }}>
                {tagFacets.map((facet) => (
                  <FilterChip
                    key={facet.value}
                    label={`${facet.value} (${facet.count})`}
                    selected={filters.tags.includes(facet.value)}
                    onPress={() => setFilters({ tags: toggle(filters.tags, facet.value) })}
                  />
                ))}
              </View>
            </>
          )}

          {brandFacets.length > 0 && (
            <>
              <Text className={`${mutedTextClass} text-sm font-semibold pt-6 pb-2`}>Brand</Text>
              <View className='flex-row flex-wrap' style={{ gap: 8 }}>
                {brandFacets.map((facet) => (
                  <FilterChip
                    key={facet.value}
                    label={`${facet.value} (${facet.count})`}
                    selected={filters.brands.includes(facet.value)}
                    onPress={() => setFilters({ brands: toggle(filters.brands, facet.value) })}
                  />
                ))}
              </View>
            </>
          )}

          <Button label='Apply' onPress={onClose} className='mt-8' />
        </ScrollView>
      </View>
    </Modal>
  )
}

export default PickerFilterSheet
