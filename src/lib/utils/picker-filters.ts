// Picker filtering (Pro — see src/lib/entitlements.ts): narrows the
// weighted-random candidate pool by attributes already on the collection row,
// so pickWeightedIndex's weighting math is untouched — it just runs over a
// smaller array.
export interface PickerFilters {
  // "any of" (OR) — matches an item that has at least one selected tag, the
  // usual semantics for a freeform category filter
  tags: string[]
  brands: string[]
  unwornOnly: boolean
}

export const EMPTY_PICKER_FILTERS: PickerFilters = { tags: [], brands: [], unwornOnly: false }

export const pickerFiltersActive = (filters: PickerFilters): boolean =>
  filters.tags.length > 0 || filters.brands.length > 0 || filters.unwornOnly

export const applyPickerFilters = <
  T extends { name: string; tags: string[] | null; times_worn: number },
>(
  collection: T[],
  filters: PickerFilters
): T[] => {
  if (!pickerFiltersActive(filters)) return collection
  return collection.filter((item) => {
    if (filters.tags.length && !filters.tags.some((tag) => (item.tags ?? []).includes(tag))) {
      return false
    }
    if (filters.brands.length) {
      const brand = item.name.split(" - ")[0]?.trim() || item.name
      if (!filters.brands.includes(brand)) return false
    }
    if (filters.unwornOnly && item.times_worn > 0) return false
    return true
  })
}
