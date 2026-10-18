import React, { useState } from "react"
import { View, FlatList, Text, RefreshControl, ScrollView } from "react-native"
import { useTabBottomPadding } from "@/lib/utils/use-tab-bottom-padding"
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
import NativeMenu from "@/components/shared/ui/native-menu"
import MenuChip from "@/components/shared/ui/menu-chip"
import SkeletonList from "@/components/shared/ui/skeleton-list"

type TopSection = "fragrances" | "collectors"

const SECTIONS = [
  { key: "fragrances", labelKey: "top.mostWorn" },
  { key: "collectors", labelKey: "top.topCollectors" },
] as const

// Discover's "Top" view: both community rankings — most-worn fragrances and
// top collectors — picked from one dropdown, with the period dropdown beside it
// for the fragrances ranking only.
// `header` (Discover's segmented control) plus this view's own menus render at
// the top of whichever state is showing, inside the scroll view, so they clear
// the large title
const DiscoverTop = ({ header }: { header?: React.ReactNode }) => {
  const bottomPadding = useTabBottomPadding(60)
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
  const { viewColors, accentColors, mutedTextClass } = useTheme()
  const { t } = useLocale()

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
  const listBottomPadding = { paddingBottom: bottomPadding }

  const listHeader = (
    <>
      {header}
      <View className='flex-row items-center justify-between px-4 pt-3 pb-2'>
        <NativeMenu
          title={t("top.sectionTitle")}
          testID='top-section-menu'
          items={SECTIONS.map(({ key, labelKey }) => ({
            id: key,
            title: t(labelKey),
            checked: key === section,
            onPress: () => setSection(key),
          }))}>
          <MenuChip
            label={t(SECTIONS.find(({ key }) => key === section)!.labelKey)}
            accessibilityLabel={t("top.sectionTitle")}
          />
        </NativeMenu>
        {section === "fragrances" && (
          <NativeMenu
            title={t("top.periodTitle")}
            testID='top-period-menu'
            items={WEAR_PERIODS.map(({ key, labelKey }) => ({
              id: key,
              title: t(labelKey),
              checked: key === period,
              onPress: () => setPeriod(key),
            }))}>
            <MenuChip
              label={t(WEAR_PERIODS.find(({ key }) => key === period)!.labelKey)}
              accessibilityLabel={t("top.periodTitle")}
              active={period !== "week"}
            />
          </NativeMenu>
        )}
      </View>
    </>
  )

  // Loading / error states: same header, in a plain inset-adjusted scroll view
  const statusView = (content: React.ReactNode) => (
    <ScrollView contentInsetAdjustmentBehavior='automatic'>
      {listHeader}
      {content}
    </ScrollView>
  )

  return (
    <View className={`${viewColors.background} flex-1`}>
      {section === "fragrances" ? (
        <>
          {isLoading ? (
            statusView(<SkeletonList />)
          ) : error ? (
            statusView(
              <EmptyState
                icon='cloud-alert'
                title={t("top.errorTitle")}
                message={t("collection.loadErrorMessage")}
                actionLabel={t("collection.tryAgain")}
                onAction={() => refetch()}
              />
            )
          ) : (
            <FlatList
              data={data ?? []}
              contentInsetAdjustmentBehavior='automatic'
              ListHeaderComponent={listHeader}
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
                  {period === "all" ? t("top.emptyAll") : t("top.emptyPeriod")}
                </Text>
              }
            />
          )}
        </>
      ) : collectorsLoading ? (
        statusView(<SkeletonList />)
      ) : collectorsError ? (
        statusView(
          <EmptyState
            icon='cloud-alert'
            title={t("collectors.errorTitle")}
            message={t("collectors.errorMessage")}
            actionLabel={t("collectors.errorAction")}
            onAction={() => refetchCollectors()}
          />
        )
      ) : (
        <FlatList
          data={collectors ?? []}
          contentInsetAdjustmentBehavior='automatic'
          ListHeaderComponent={<View className='pb-1'>{listHeader}</View>}
          contentContainerStyle={listBottomPadding}
          refreshControl={refreshControl}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item, index }) => (
            <View className='px-4'>
              <CollectorListItem profile={item} place={index + 1} />
            </View>
          )}
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

export default DiscoverTop
