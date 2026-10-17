import React from "react"
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { useExploreFragrances, useFragranceRatings, usePopularBrands, useTopWorn } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import TopListItem from "./top-list-item"
import OnboardingChecklist from "./onboarding-checklist"
import Row from "./shared/ui/row"
import RowGroup from "./shared/ui/row-group"

const TRENDING_COUNT = 5

// The Search tab before anything is typed: what the community is wearing,
// popular brands to browse (tapping one applies the brand filter), and a few
// random catalog picks with photos. Every section hides itself when empty.
const SearchBrowse = ({ onPickBrand }: { onPickBrand: (brand: string) => void }) => {
  const insets = useSafeAreaInsets()
  const { mutedTextClass, mutedColors, accentColors } = useTheme()
  const { t } = useLocale()

  const week = useTopWorn("week")
  const allTime = useTopWorn("all")
  const brands = usePopularBrands()
  const explore = useExploreFragrances()

  // A quiet week falls back to the all-time ranking rather than an empty section
  const weekHasData = (week.data?.length ?? 0) > 0
  const trending = (weekHasData ? week.data : allTime.data)?.slice(0, TRENDING_COUNT) ?? []
  const exploreItems = explore.data ?? []

  const { data: ratings } = useFragranceRatings([
    ...trending.map((item) => item.fragrance_id),
    ...exploreItems.map((item) => item.id),
  ])

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([week.refetch(), allTime.refetch(), brands.refetch(), explore.refetch()])
  )

  const sectionTitle = (label: string, action?: { label: string; onPress: () => void }) => (
    <View className='flex-row items-center justify-between px-4 pt-6 pb-2'>
      <Text className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider`}>{label}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={8} accessibilityRole='button'>
          <Text className={`${mutedTextClass} text-sm font-semibold`}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <ScrollView
      keyboardShouldPersistTaps='handled'
      contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={getColor(accentColors)}
          colors={[getColor(accentColors)]}
        />
      }>
      {/* Where a brand-new user goes to add their first bottle, so the
          checklist lives here rather than only on the Collection tab */}
      <OnboardingChecklist />

      {trending.length > 0 && (
        <>
          {sectionTitle(weekHasData ? t("search.browse.trendingWeek") : t("search.browse.trendingAll"))}
          {trending.map((item) => (
            <TopListItem
              key={`${item.place}-${item.name}`}
              name={item.name}
              place={item.place}
              imageUrl={item.image_url}
              wearCount={item.wear_count}
              fragranceId={item.fragrance_id}
              avgRating={item.fragrance_id ? ratings?.[item.fragrance_id]?.avg : undefined}
              ratingCount={item.fragrance_id ? ratings?.[item.fragrance_id]?.count : undefined}
            />
          ))}
        </>
      )}

      {(brands.data?.length ?? 0) > 0 && (
        <>
          {sectionTitle(t("search.browse.popularBrands"))}
          <View className='px-3'>
            <RowGroup>
              {brands.data!.map(({ brand, fragrance_count }) => (
                <Row
                  key={brand}
                  icon='tag-outline'
                  label={brand}
                  onPress={() => onPickBrand(brand)}
                  testID={`popular-brand-${brand}`}
                  trailing={
                    <View className='flex-row items-center' style={{ gap: 2 }}>
                      <Text className={`${mutedTextClass} text-sm`}>
                        {t("collection.count", { count: fragrance_count })}
                      </Text>
                      <MaterialCommunityIcons name='chevron-right' size={22} color={getColor(mutedColors)} />
                    </View>
                  }
                />
              ))}
            </RowGroup>
          </View>
        </>
      )}

      {exploreItems.length > 0 && (
        <>
          {sectionTitle(t("search.browse.explore"), {
            label: t("search.browse.shuffle"),
            onPress: () => explore.refetch(),
          })}
          {exploreItems.map((item) => (
            <TopListItem
              key={item.id}
              name={`${item.brand} - ${item.name}`}
              imageUrl={item.image_url}
              fragranceId={item.id}
              avgRating={ratings?.[item.id]?.avg}
              ratingCount={ratings?.[item.id]?.count}
            />
          ))}
        </>
      )}
    </ScrollView>
  )
}

export default SearchBrowse
