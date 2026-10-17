import React, { useCallback, useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, SectionList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { useWearDiary, useWearSummary, type WearDiaryFilters, type WearEvent } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import { useDebouncedValue } from "@/lib/utils/use-debounced-value"
import { tagFacets, brandOf, type Facet } from "@/lib/utils/collection-facets"
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

type Translate = ReturnType<typeof useLocale>["t"]

const dayTitle = (date: Date, today: Date, t: Translate) => {
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return t("diary.today")
  if (date.toDateString() === yesterday.toDateString()) return t("diary.yesterday")
  return Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" as const } : {}),
  }).format(date)
}

// Events arrive newest-first from useWearDiary, so grouping by calendar day
// (device-local, same day semantics as the once-per-day wear cap) preserves order.
const groupByDay = (events: WearEvent[], t: Translate): DaySection[] => {
  const today = new Date()
  const sections: DaySection[] = []
  let currentKey: string | null = null

  for (const event of events) {
    const date = new Date(event.worn_at)
    const key = date.toDateString()
    if (key !== currentKey) {
      currentKey = key
      sections.push({ title: dayTitle(date, today, t), data: [] })
    }
    sections[sections.length - 1].data.push(event)
  }
  return sections
}

// Facets from (value, wear count) pairs — wear_summary rows are already
// aggregated per scent, so each contributes its whole wear count
const countFacets = (pairs: [string, number][]): Facet[] => {
  const counts = new Map<string, number>()
  for (const [value, n] of pairs) counts.set(value, (counts.get(value) ?? 0) + n)
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value)
  )
}

const topFacets = (facets: Facet[], limit: number) => facets.slice(0, limit)

const promptWearHistoryUpsell = (t: Translate) =>
  promptProUpsell(t("diary.upsellTitle"), t("diary.upsellMessage"))

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
  const { t } = useLocale()
  const {
    data: summary,
    isPending: summaryPending,
    error: summaryError,
    refetch: refetchSummary,
  } = useWearSummary(user?.id)

  const [search, setSearch] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [openPicker, setOpenPicker] = useState<"tag" | "brand" | null>(null)
  const [facetSearch, setFacetSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  // Tags live on the collection row, not the (denormalized) wear event —
  // cross-reference by user_fragrance_id. Events whose row was since deleted
  // (user_fragrance_id -> NULL) simply can't be tag-filtered, only browsed.
  const tagsByRowId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const item of userCollection) map.set(item.id, item.tags)
    return map
  }, [userCollection])

  // The diary is paged, so header stats, facets and insights come from the
  // uncapped per-scent summary, not from whichever pages happen to be loaded
  const scents = useMemo(() => summary ?? [], [summary])

  const allTagOptions = useMemo(() => tagFacets(userCollection), [userCollection])
  // Brand facets come from wear history (denormalized name), so they stay
  // accurate even for fragrances since removed from the collection.
  const allBrandOptions = useMemo(
    () => countFacets(scents.map((row) => [brandOf(row.name), row.wears])),
    [scents]
  )

  const facetNeedle = facetSearch.trim().toLowerCase()
  const tagOptions = facetNeedle
    ? allTagOptions.filter((f) => f.value.toLowerCase().includes(facetNeedle))
    : allTagOptions
  const brandOptions = facetNeedle
    ? allBrandOptions.filter((f) => f.value.toLowerCase().includes(facetNeedle))
    : allBrandOptions

  const brandFilterActive = isPro && selectedBrands.length > 0
  const tagFilterActive = isPro && selectedTags.length > 0
  const rowMatchesTags = useCallback(
    (rowId: string | null) => {
      const rowTags = rowId ? (tagsByRowId.get(rowId) ?? []) : []
      return selectedTags.some((tag) => rowTags.includes(tag))
    },
    [tagsByRowId, selectedTags]
  )

  // Same predicate as the server-side diary filters below, applied to the
  // summary rows for the Pro insights
  const filteredScents = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase()
    return scents.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false
      if (brandFilterActive && !selectedBrands.includes(brandOf(row.name))) return false
      if (tagFilterActive && !rowMatchesTags(row.user_fragrance_id)) return false
      return true
    })
  }, [scents, debouncedSearch, brandFilterActive, selectedBrands, tagFilterActive, rowMatchesTags])

  const diaryFilters = useMemo<WearDiaryFilters>(
    () => ({
      search: debouncedSearch,
      names: brandFilterActive
        ? Array.from(
            new Set(scents.filter((row) => selectedBrands.includes(brandOf(row.name))).map((row) => row.name))
          )
        : null,
      userFragranceIds: tagFilterActive
        ? userCollection.filter((item) => rowMatchesTags(item.id)).map((item) => item.id)
        : null,
    }),
    [debouncedSearch, brandFilterActive, selectedBrands, scents, tagFilterActive, userCollection, rowMatchesTags]
  )

  const {
    data: diary,
    isPending: diaryPending,
    error: diaryError,
    refetch: refetchDiary,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useWearDiary(user?.id, diaryFilters)
  const sections = useMemo(() => groupByDay(diary?.pages.flat() ?? [], t), [diary, t])

  const refetchAll = useCallback(
    () => Promise.all([refetchSummary(), refetchDiary()]),
    [refetchSummary, refetchDiary]
  )
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll)

  const { totalWears, weekWears, uniqueWorn } = useMemo(() => {
    const unique = new Set<string>()
    let totalWears = 0
    let weekWears = 0
    for (const row of scents) {
      unique.add(row.user_fragrance_id ?? row.name)
      totalWears += row.wears
      weekWears += row.recent_wears
    }
    return { totalWears, weekWears, uniqueWorn: unique.size }
  }, [scents])

  // Pro "insights": what's driving the currently filtered set — top tags and
  // top brands by wear count, so filtering doubles as a lightweight analysis
  // tool instead of just narrowing the list.
  const brandInsights = useMemo(
    () => topFacets(countFacets(filteredScents.map((row) => [brandOf(row.name), row.wears])), 5),
    [filteredScents]
  )
  const tagInsights = useMemo(() => {
    const pairs = filteredScents.flatMap((row) =>
      (row.user_fragrance_id ? (tagsByRowId.get(row.user_fragrance_id) ?? []) : []).map(
        (tag): [string, number] => [tag, row.wears]
      )
    )
    return topFacets(countFacets(pairs), 5)
  }, [filteredScents, tagsByRowId])

  const hasFilters = search.length > 0 || selectedTags.length > 0 || selectedBrands.length > 0
  const maxBrandCount = brandInsights[0]?.count ?? 0
  const maxTagCount = tagInsights[0]?.count ?? 0

  const openFacetPicker = (kind: "tag" | "brand") => {
    if (!isPro) {
      promptWearHistoryUpsell(t)
      return
    }
    setFacetSearch("")
    setOpenPicker(kind)
  }

  if (diaryPending || summaryPending) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        <SkeletonList />
      </View>
    )
  }

  if (diaryError || summaryError) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        <EmptyState
          icon='cloud-alert'
          title={t("diary.loadErrorTitle")}
          message={t("collection.loadErrorMessage")}
          actionLabel={t("collection.tryAgain")}
          onAction={() => refetchAll()}
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
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator className='py-6' color={getColor("zinc-400")} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={getColor("zinc-400")}
          />
        }
        ListHeaderComponent={
          totalWears > 0 ? (
            <View className='px-4 pb-2'>
              <StatTile
                items={[
                  { value: totalWears, label: t("detail.timesWorn") },
                  { value: weekWears, label: t("diary.thisWeek") },
                  { value: uniqueWorn, label: t("diary.uniqueScents") },
                ]}
              />

              <View
                className={`flex-row items-center rounded-full px-3 mt-4 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
                <MaterialCommunityIcons name='magnify' size={18} color={getColor(mutedColors)} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t("diary.searchPlaceholder")}
                  placeholderTextColor={getColor(mutedColors)}
                  autoCorrect={false}
                  className='flex-1 px-2 py-2.5'
                  style={{ color: getColor(baseColors) }}
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch("")}
                    hitSlop={8}
                    accessibilityRole='button'
                    accessibilityLabel={t("diary.clearSearch")}>
                    <MaterialCommunityIcons name='close-circle' size={16} color={getColor(mutedColors)} />
                  </TouchableOpacity>
                )}
              </View>

              {isPro ? (
                <>
                  <View className='flex-row pt-4' style={{ gap: 8 }}>
                    <FilterChip
                      label={selectedTags.length ? t("diary.tagsCount", { count: selectedTags.length }) : t("detail.tags")}
                      selected={selectedTags.length > 0}
                      onPress={() => openFacetPicker("tag")}
                    />
                    <FilterChip
                      label={selectedBrands.length ? t("diary.brandCount", { count: selectedBrands.length }) : t("diary.brand")}
                      selected={selectedBrands.length > 0}
                      onPress={() => openFacetPicker("brand")}
                    />
                    {hasFilters && (
                      <FilterChip
                        label={t("diary.clear")}
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
                      <Text className={`${baseTextClass} text-sm font-bold`}>{t("diary.insights")}</Text>
                      {brandInsights.length > 0 && (
                        <>
                          <Text className={`${mutedTextClass} text-xs font-semibold pt-3`}>{t("diary.topBrands")}</Text>
                          {brandInsights.map((facet) => (
                            <InsightRow key={facet.value} facet={facet} maxCount={maxBrandCount} />
                          ))}
                        </>
                      )}
                      {tagInsights.length > 0 && (
                        <>
                          <Text className={`${mutedTextClass} text-xs font-semibold pt-4`}>{t("diary.topTags")}</Text>
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
                  label={t("diary.proRow")}
                  onPress={() => promptWearHistoryUpsell(t)}
                />
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          totalWears === 0 ? (
            <EmptyState
              icon='bottle-tonic-outline'
              illustration={<EmptyCollectionIllustration />}
              title={t("diary.emptyTitle")}
              message={t("diary.emptyMessage")}
            />
          ) : (
            <EmptyState
              icon='magnify-close'
              title={t("diary.noMatchesTitle")}
              message={t("diary.noMatchesMessage")}
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
        title={t("detail.tags")}
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
        title={t("diary.brand")}
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
