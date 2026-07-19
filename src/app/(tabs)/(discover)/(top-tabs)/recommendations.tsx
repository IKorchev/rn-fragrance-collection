import React from "react"
import { FlatList, RefreshControl, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import { useRecommendations } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import RecommendationListItem from "@/components/recommendation-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"

const RecommendationsScreen = () => {
  const insets = useSafeAreaInsets()
  const { user, collectionPending } = useAuth()
  const { viewColors, accentColors } = useTheme()
  const { data, isLoading, error, refetch } = useRecommendations(user?.id, !collectionPending)
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

  return (
    <View className={`${viewColors.background} flex-1`}>
      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <EmptyState
          icon='cloud-alert'
          title="Couldn't load recommendations"
          message='Check your connection and try again.'
          actionLabel='Try again'
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.fragrance_id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 60 }}
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
              title='No recommendations yet'
              message='Add a few fragrances to your collection, or check back as the community logs more scents.'
            />
          }
        />
      )}
    </View>
  )
}

export default RecommendationsScreen
