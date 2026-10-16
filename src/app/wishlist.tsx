import React from "react"
import { FlatList, RefreshControl, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { useWishlist } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import WishlistListItem from "@/components/wishlist-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"

// "Want to try" list, pushed from the Profile tab. Items are added from the
// fragrance detail sheet of any catalog fragrance
const WishlistScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { viewColors, accentColors } = useTheme()
  const { t } = useLocale()
  const { data, isPending, error, refetch } = useWishlist(user?.id)
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

  if (isPending) {
    return (
      <View className={`flex-1 ${viewColors.background}`}>
        <SkeletonList />
      </View>
    )
  }

  if (error) {
    return (
      <View className={`flex-1 ${viewColors.background}`}>
        <EmptyState
          icon='cloud-alert'
          title={t("wishlist.errorTitle")}
          message={t("collection.loadErrorMessage")}
          actionLabel={t("collection.tryAgain")}
          onAction={() => refetch()}
        />
      </View>
    )
  }

  return (
    <View className={`flex-1 ${viewColors.background}`}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.fragrance_id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={getColor(accentColors)}
            colors={[getColor(accentColors)]}
          />
        }
        renderItem={({ item }) => <WishlistListItem item={item} />}
        ListEmptyComponent={
          <EmptyState
            icon='bookmark-outline'
            title={t("wishlist.emptyTitle")}
            message={t("wishlist.emptyMessage")}
            actionLabel={t("collection.emptyAction")}
            onAction={() => router.navigate("/(tabs)/(discover)/(top-tabs)/search")}
          />
        }
      />
    </View>
  )
}

export default WishlistScreen
