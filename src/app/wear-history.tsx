import React, { useMemo, useState } from "react"
import { RefreshControl, SectionList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import { useWearHistory, type WearEvent } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import { brandFacets, tagFacets, brandOf, type Facet } from "@/lib/utils/collection-facets"
import { promptProUpsell } from "@/lib/entitlements"
import Card from "@/components/card"
import EmptyState from "@/components/shared/ui/empty-state"
import StatTile from "@/components/shared/ui/stat-tile"
import Row from "@/components/shared/ui/row"
import FilterChip from "@/components/shared/ui/filter-chip"
import FilterPickerModal from "@/components/filter-picker-modal"
import { EmptyCollectionIllustration } from "@/components/empty-illustrations"
import SkeletonList from "@/components/shared/ui/skeleton-list"

interface DaySection {
  title: string
  data: WearEvent[]
}

const dayTitle = (date: Date, today: Date) => {
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" as const } : {}),
  }).format(date)
}

// Events arrive newest-first from useWearHistory, so grouping by calendar day
// (device-local, same day semantics as the once-per-day wear cap) preserves order.
const groupByDay = (events: WearEvent[]): DaySection[] => {
  const today = new Date()
  const sections: DaySection[] = []
  let currentKey: string | null = null

  for (const event of events) {
    const date = new Date(event.worn_at)
    const key = date.toDateString()
    if (key !== currentKey) {
      currentKey = key
      sections.push({ title: dayTitle(date, today), data: [] })
    }
    sections[sections.length - 1].data.push(event)
  }
  return sections
}

const topFacets = (facets: Facet[], limit: number) => facets.slice(0, limit)

const promptWearHistoryUpsell = () =>
  promptProUpsell(
    "Wear-history filters are a Pro feature",
    "Upgrade to Pro to filter your diary by tag/brand and see wear insights."
  )

const InsightRow = ({ facet, maxCount }: { facet: Facet; maxCount: number }) => {
  const { theme, baseTextClass, mutedTextClass, accentColors } = useTheme()
  const pct = maxCount > 0 ? Math.round((facet.count / maxCount) * 100) : 0

  return (
    <View className='pt-2'>
      <View className='flex-row items-center justify-between'>
        <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
          {facet.value}
        </Text>
        <Text className={`${mutedTextClass} text-xs pl-2`}>{facet.count}</Text>
      </View>
      <View
        className={`h-1.5 rounded-full mt-1 overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-black/5"}`}>
        <View
          className='h-full rounded-full'
          style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: getColor(accentColors) }}
        />
      </View>
    </View>
  )
}

const WearHistoryScreen = () => {
  const router = useRouter()
  const { modalColors, baseTextClass, mutedTextClass, mutedColors, baseColors, theme } = useTheme()
  const { user, userCollection, isPro } = useAuth()
  const { data: events, isPending, error, refetch } = useWearHistory(user?.id)
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

  const [search, setSearch] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [openPicker, setOpenPicker] = useState<"tag" | "brand" | null>(null)
  const [facetSearch, setFacetSearch] = useState("")

  // Tags live on the collection row, not the (denormalized) wear event —
  // cross-reference by user_fragrance_id. Events whose row was since deleted
  // (user_fragrance_id -> NULL) simply can't be tag-filtered, only browsed.
  const tagsByRowId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const item of userCollection) map.set(item.id, item.tags)
    return map
  }, [userCollection])

  const allTagOptions = useMemo(() => tagFacets(userCollection), [userCollection])
  // Brand facets come from the events themselves (denormalized name), so they
  // stay accurate even for fragrances since removed from the collection.
  const allBrandOptions = useMemo(() => brandFacets(events ?? []), [events])

  const facetNeedle = facetSearch.trim().toLowerCase()
  const tagOptions = facetNeedle
    ? allTagOptions.filter((f) => f.value.toLowerCase().includes(facetNeedle))
    : allTagOptions
  const brandOptions = facetNeedle
    ? allBrandOptions.filter((f) => f.value.toLowerCase().includes(facetNeedle))
    : allBrandOptions

  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (events ?? []).filter((event) => {
      if (needle && !event.name.toLowerCase().includes(needle)) return false
      if (isPro && selectedBrands.length && !selectedBrands.includes(brandOf(event.name))) {
        return false
      }
      if (isPro && selectedTags.length) {
        const rowTags = event.user_fragrance_id ? (tagsByRowId.get(event.user_fragrance_id) ?? []) : []
        if (!selectedTags.some((tag) => rowTags.includes(tag))) return false
      }
      return true
    })
  }, [events, search, isPro, selectedBrands, selectedTags, tagsByRowId])

  const sections = useMemo(() => groupByDay(filteredEvents), [filteredEvents])

  const { totalWears, weekWears, uniqueWorn } = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const unique = new Set<string>()
    let weekWears = 0
    for (const event of events ?? []) {
      unique.add(event.user_fragrance_id ?? event.name)
      if (now - new Date(event.worn_at).getTime() < weekMs) weekWears++
    }
    return { totalWears: (events ?? []).length, weekWears, uniqueWorn: unique.size }
  }, [events])

  // Pro "insights": what's driving the currently filtered set — top tags and
  // top brands by wear count, so filtering doubles as a lightweight analysis
  // tool instead of just narrowing the list.
  const brandInsights = useMemo(() => topFacets(brandFacets(filteredEvents), 5), [filteredEvents])
  const tagInsights = useMemo(() => {
    const withTags = filteredEvents.map((event) => ({
      tags: event.user_fragrance_id ? (tagsByRowId.get(event.user_fragrance_id) ?? []) : [],
    }))
    return topFacets(tagFacets(withTags), 5)
  }, [filteredEvents, tagsByRowId])

  const hasFilters = search.length > 0 || selectedTags.length > 0 || selectedBrands.length > 0
  const maxBrandCount = brandInsights[0]?.count ?? 0
  const maxTagCount = tagInsights[0]?.count ?? 0

  const openFacetPicker = (kind: "tag" | "brand") => {
    if (!isPro) {
      promptWearHistoryUpsell()
      return
    }
    setFacetSearch("")
    setOpenPicker(kind)
  }

  if (isPending) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        <SkeletonList />
      </View>
    )
  }

  if (error) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        <EmptyState
          icon='cloud-alert'
          title="Couldn't load your wear history"
          message='Check your connection and try again.'
          actionLabel='Try again'
          onAction={() => refetch()}
        />
      </View>
    )
  }

  return (
    <View className={`flex-1 ${modalColors.background}`}>
      <SectionList
        sections={sections}
        keyExtractor={(event) => event.id}
        contentContainerClassName='pb-12 pt-2'
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={getColor("emerald-500")}
          />
        }
        ListHeaderComponent={
          (events ?? []).length > 0 ? (
            <View className='px-4 pb-2'>
              <StatTile
                items={[
                  { value: totalWears, label: "Total wears" },
                  { value: weekWears, label: "This week" },
                  { value: uniqueWorn, label: "Unique worn" },
                ]}
              />

              <View
                className={`flex-row items-center rounded-full px-3 mt-4 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
                <MaterialCommunityIcons name='magnify' size={18} color={getColor(mutedColors)} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder='Search your diary'
                  placeholderTextColor={getColor(mutedColors)}
                  autoCorrect={false}
                  className='flex-1 px-2 py-2.5'
                  style={{ color: getColor(baseColors) }}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                    <MaterialCommunityIcons name='close-circle' size={16} color={getColor(mutedColors)} />
                  </TouchableOpacity>
                )}
              </View>

              {isPro ? (
                <>
                  <View className='flex-row pt-4' style={{ gap: 8 }}>
                    <FilterChip
                      label={selectedTags.length ? `Tags (${selectedTags.length})` : "Tags"}
                      selected={selectedTags.length > 0}
                      onPress={() => openFacetPicker("tag")}
                    />
                    <FilterChip
                      label={selectedBrands.length ? `Brand (${selectedBrands.length})` : "Brand"}
                      selected={selectedBrands.length > 0}
                      onPress={() => openFacetPicker("brand")}
                    />
                    {hasFilters && (
                      <FilterChip
                        label='Clear'
                        selected={false}
                        onPress={() => {
                          setSearch("")
                          setSelectedTags([])
                          setSelectedBrands([])
                        }}
                      />
                    )}
                  </View>

                  {(brandInsights.length > 0 || tagInsights.length > 0) && (
                    <View className={`rounded-2xl border ${theme === "dark" ? "border-zinc-800" : "border-zinc-200"} p-4 mt-4`}>
                      <Text className={`${baseTextClass} text-sm font-bold`}>Insights</Text>
                      {brandInsights.length > 0 && (
                        <>
                          <Text className={`${mutedTextClass} text-xs font-semibold pt-3`}>TOP BRANDS</Text>
                          {brandInsights.map((facet) => (
                            <InsightRow key={facet.value} facet={facet} maxCount={maxBrandCount} />
                          ))}
                        </>
                      )}
                      {tagInsights.length > 0 && (
                        <>
                          <Text className={`${mutedTextClass} text-xs font-semibold pt-4`}>TOP TAGS</Text>
                          {tagInsights.map((facet) => (
                            <InsightRow key={facet.value} facet={facet} maxCount={maxTagCount} />
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <Row
                  icon='lock-outline'
                  tone='accent'
                  className='mt-4'
                  label='Filter by tag/brand & see insights — Pro'
                  onPress={promptWearHistoryUpsell}
                />
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          (events ?? []).length === 0 ? (
            <EmptyState
              icon='bottle-tonic-outline'
              illustration={<EmptyCollectionIllustration />}
              title='No wears logged yet'
              message='Tap the spray button on a fragrance to start your diary.'
            />
          ) : (
            <EmptyState
              icon='magnify-close'
              title='No wears match'
              message='Try changing your search or filters.'
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <Text className={`${mutedTextClass} text-sm font-semibold px-4 pt-5 pb-1`}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const brand = item.name.split(" - ")[0]
          const title = item.name.split(" - ").slice(1).join(" - ")

          return (
            <Card.Root
              onPress={() =>
                router.push({
                  pathname: "/fragrance-detail",
                  params: { name: item.name, imageUrl: item.image_url ?? "" },
                })
              }>
              <Card.Thumbnail imageUrl={item.image_url} />
              <Card.Content>
                <Card.Title>{title}</Card.Title>
                <Card.Subtitle>{brand}</Card.Subtitle>
              </Card.Content>
            </Card.Root>
          )
        }}
      />

      <FilterPickerModal
        visible={openPicker === "tag"}
        title='Tags'
        options={tagOptions}
        loading={false}
        searchValue={facetSearch}
        onSearchChange={setFacetSearch}
        multiSelect
        selected={selectedTags}
        onToggle={(value) =>
          setSelectedTags((prev) =>
            prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
          )
        }
        onClear={() => setSelectedTags([])}
        onClose={() => setOpenPicker(null)}
      />
      <FilterPickerModal
        visible={openPicker === "brand"}
        title='Brand'
        options={brandOptions}
        loading={false}
        searchValue={facetSearch}
        onSearchChange={setFacetSearch}
        multiSelect
        selected={selectedBrands}
        onToggle={(value) =>
          setSelectedBrands((prev) =>
            prev.includes(value) ? prev.filter((b) => b !== value) : [...prev, value]
          )
        }
        onClear={() => setSelectedBrands([])}
        onClose={() => setOpenPicker(null)}
      />
    </View>
  )
}

export default WearHistoryScreen
