// Distinct-value + count facets derived client-side from the already-loaded
// collection (or wear history) — reused by the picker filter sheet, the
// collection tab's tag filter, and wear-history's brand/tag filters.
export interface Facet {
  value: string
  count: number
}

const byCountThenName = (a: Facet, b: Facet) => b.count - a.count || a.value.localeCompare(b.value)

// "Brand - Title" convention (see CLAUDE.md) — works for both UserFragrance
// and WearEvent rows, since both carry a denormalized `name`.
export const brandOf = (name: string): string => name.split(" - ")[0]?.trim() || name

export const brandFacets = (items: { name: string }[]): Facet[] => {
  const counts = new Map<string, number>()
  for (const item of items) {
    const brand = brandOf(item.name)
    counts.set(brand, (counts.get(brand) ?? 0) + 1)
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(byCountThenName)
}

export const tagFacets = (items: { tags: string[] | null }[]): Facet[] => {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(byCountThenName)
}
