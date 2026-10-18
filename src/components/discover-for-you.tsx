import React from "react"
import { FlatList, RefreshControl, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { useTabBottomPadding } from "@/lib/utils/use-tab-bottom-padding"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { useRecommendations } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import RecommendationListItem from "@/components/recommendation-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"

// Discover's "For You" view — rendered by the Discover screen's segmented control
// `header` (Discover's segmented control) renders at the top of whichever
// state is showing, inside the scroll view, so it clears the large title
const DiscoverForYou = ({ header }: { header?: React.ReactNode }) => {
  const bottomPadding = useTabBottomPadding(60)
  const router = useRouter()
  const { t } = useLocale()
  const { user, collectionPending } = useAuth()
  const { viewColors, accentColors } = useTheme()
  const { data, isLoading, error, refetch } = useRecommendations(user?.id, !collectionPending)
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

  return (
    <View className={`${viewColors.background} flex-1`}>
      {isLoading || error ? (
        <ScrollView contentInsetAdjustmentBehavior='automatic'>
          {header}
          {isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState
              icon='cloud-alert'
              title={t("discover.forYou.errorTitle")}
              message={t("discover.forYou.errorMessage")}
              actionLabel={t("collection.tryAgain")}
              onAction={() => refetch()}
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={data ?? []}
          contentInsetAdjustmentBehavior='automatic'
          ListHeaderComponent={<>{header}</>}
          keyExtractor={(item) => item.fragrance_id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomPadding }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={getColor(accentColors)}
              colors={[getColor(accentColors)]}
            />
          }
          renderItem={({ item }) => <RecommendationListItem item={item} />}
          ListEmptyComponent={
            <EmptyState
              icon='compass-outline'
              title={t("discover.forYou.emptyTitle")}
              message={t("discover.forYou.emptyMessage")}
              actionLabel={t("discover.forYou.emptyAction")}
              onAction={() => router.navigate("/(tabs)/(search)")}
            />
          }
        />
      )}
    </View>
  )
}

export default DiscoverForYou
