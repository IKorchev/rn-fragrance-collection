import React, { useState } from "react"
import { View, FlatList, ActivityIndicator, Text, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Chip } from "@rneui/themed"
import { useTopWorn, useFragranceRatings, WEAR_PERIODS, type WearPeriod } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import useTheme from "@/contexts/theme-context"
import TopListItem from "@/components/top-list-item"
import EmptyState from "@/components/empty-state"

const MostWornScreen = () => {
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<WearPeriod>("week")
  const { data, isLoading, error, refetch } = useTopWorn(period)
  const { data: ratings } = useFragranceRatings((data ?? []).map((item) => item.fragrance_id))
  const { refreshing, onRefresh } = usePullToRefresh(refetch)
  const { theme, viewColors, accentColors, mutedColors, cardBorderColors, mutedTextClass } =
    useTheme()

  return (
    <View className={`${viewColors.background} flex-1`}>
      <View className='py-3 flex-row justify-evenly w-full'>
        {WEAR_PERIODS.map(({ key, label }) => {
          const isSelected = key === period
          return (
            <Chip
              key={key}
              type='outline'
              containerStyle={{
                borderRadius: 9999,
                borderWidth: 1,
                borderColor: isSelected ? getColor(accentColors) : getColor(cardBorderColors),
                backgroundColor: isSelected
                  ? theme === "dark"
                    ? "rgba(52, 211, 153, 0.15)"
                    : getColor("emerald-50")
                  : undefined,
              }}
              buttonStyle={{ paddingHorizontal: 12, borderRadius: 9999 }}
              titleStyle={{
                fontSize: 13,
                fontWeight: "600",
                color: isSelected ? getColor(accentColors) : getColor(mutedColors),
              }}
              title={label}
              onPress={() => setPeriod(key)}
            />
          )
        })}
      </View>
      {isLoading ? (
        <ActivityIndicator color={getColor(accentColors)} size='large' className='mt-24' />
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
              No wears logged {period === "all" ? "yet" : "in this period yet"} — hit the spray
              button on something in your collection!
            </Text>
          }
        />
      )}
    </View>
  )
}

export default MostWornScreen
