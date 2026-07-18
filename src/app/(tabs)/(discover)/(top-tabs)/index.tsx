import React, { useState } from "react"
import { View, FlatList, Text, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTopWorn, useFragranceRatings, WEAR_PERIODS, type WearPeriod } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import useTheme from "@/contexts/theme-context"
import TopListItem from "@/components/top-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import FilterChip from "@/components/shared/ui/filter-chip"
import SkeletonList from "@/components/shared/ui/skeleton-list"

const MostWornScreen = () => {
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<WearPeriod>("week")
  const { data, isLoading, error, refetch } = useTopWorn(period)
  const { data: ratings } = useFragranceRatings((data ?? []).map((item) => item.fragrance_id))
  const { refreshing, onRefresh } = usePullToRefresh(refetch)
  const { viewColors, accentColors, mutedTextClass } = useTheme()

  return (
    <View className={`${viewColors.background} flex-1`}>
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
          // NativeTabs' bar floats over content — pad the scroll end so the
          // last row clears it (~49pt bar + home-indicator inset)
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={getColor(accentColors)}
              colors={[getColor(accentColors)]}
            />
          }
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
    </View>
  )
}

export default MostWornScreen
