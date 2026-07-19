import React, { useState } from "react"
import { View, FlatList, Text, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  useTopWorn,
  useFragranceRatings,
  useTopCollectors,
  WEAR_PERIODS,
  type WearPeriod,
} from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import TopListItem from "@/components/top-list-item"
import CollectorListItem from "@/components/collector-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import FilterChip from "@/components/shared/ui/filter-chip"
import SegmentedControl from "@/components/shared/ui/segmented-control"
import SkeletonList from "@/components/shared/ui/skeleton-list"

type TopSection = "fragrances" | "collectors"

// The "Top" sub-tab: both community rankings — most-worn fragrances and top
// collectors — behind one segmented toggle. They used to be separate top-tabs,
// but four fixed tabs wrapped their labels; the period chips are a
// fragrances-only concern so the collectors view stays chrome-free.
const TopScreen = () => {
  const insets = useSafeAreaInsets()
  const [section, setSection] = useState<TopSection>("fragrances")
  const [period, setPeriod] = useState<WearPeriod>("week")
  const { data, isLoading, error, refetch } = useTopWorn(period)
  const { data: ratings } = useFragranceRatings((data ?? []).map((item) => item.fragrance_id))
  const {
    data: collectors,
    isLoading: collectorsLoading,
    error: collectorsError,
    refetch: refetchCollectors,
  } = useTopCollectors()
  const { refreshing, onRefresh } = usePullToRefresh(
    section === "fragrances" ? refetch : refetchCollectors
  )
  const { viewColors, accentColors, mutedTextClass, highlightColors } = useTheme()
  const { t } = useLocale()
  const highlightTint = getColor(highlightColors)

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={getColor(accentColors)}
      colors={[getColor(accentColors)]}
    />
  )
  // NativeTabs' bar floats over content — pad the scroll end so the last row
  // clears it (~49pt bar + home-indicator inset)
  const listBottomPadding = { paddingBottom: insets.bottom + 60 }

  return (
    <View className={`${viewColors.background} flex-1`}>
      <View className='px-4 pt-3'>
        <SegmentedControl
          options={[
            { label: t("collectors.segmentFragrances"), value: "fragrances" as const, tint: highlightTint, testID: "top-segment-fragrances" },
            { label: t("collectors.segmentCollectors"), value: "collectors" as const, tint: highlightTint, testID: "top-segment-collectors" },
          ]}
          value={section}
          onChange={setSection}
        />
      </View>

      {section === "fragrances" ? (
        <>
          <View className='py-3 flex-row justify-evenly w-full'>
            {WEAR_PERIODS.map(({ key, label }) => (
              <FilterChip key={key} label={label} selected={key === period} onPress={() => setPeriod(key)} />
            ))}
          </View>
          {isLoading ? (
            <SkeletonList />
          ) : error ? (
            <EmptyState
              icon='cloud-alert'
              title="Couldn't load the leaderboard"
              message='Check your connection and try again.'
              actionLabel='Try again'
              onAction={() => refetch()}
            />
          ) : (
            <FlatList
              data={data ?? []}
              contentContainerStyle={listBottomPadding}
              refreshControl={refreshControl}
              keyExtractor={(item) => `${item.place}-${item.name}`}
              renderItem={({ item }) => (
                <TopListItem
                  name={item.name}
                  place={item.place}
                  imageUrl={item.image_url}
                  wearCount={item.wear_count}
                  fragranceId={item.fragrance_id}
                  avgRating={item.fragrance_id ? ratings?.[item.fragrance_id]?.avg : undefined}
                  ratingCount={item.fragrance_id ? ratings?.[item.fragrance_id]?.count : undefined}
                />
              )}
              ListEmptyComponent={
                <Text className={`${mutedTextClass} text-center mt-12 px-6`}>
                  No scents logged {period === "all" ? "yet" : "in this period yet"} — hit the spray
                  button on something in your collection!
                </Text>
              }
            />
          )}
        </>
      ) : collectorsLoading ? (
        <SkeletonList />
      ) : collectorsError ? (
        <EmptyState
          icon='cloud-alert'
          title={t("collectors.errorTitle")}
          message={t("collectors.errorMessage")}
          actionLabel={t("collectors.errorAction")}
          onAction={() => refetchCollectors()}
        />
      ) : (
        <FlatList
          data={collectors ?? []}
          className='px-4 pt-3'
          contentContainerStyle={listBottomPadding}
          refreshControl={refreshControl}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item, index }) => <CollectorListItem profile={item} place={index + 1} />}
          ListEmptyComponent={
            <EmptyState
              icon='account-group-outline'
              title={t("collectors.emptyTitle")}
              message={t("collectors.emptyMessage")}
            />
          }
        />
      )}
    </View>
  )
}

export default TopScreen
