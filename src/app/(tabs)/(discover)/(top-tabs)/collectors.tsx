import React from "react"
import { View, FlatList, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTopCollectors } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import CollectorListItem from "@/components/collector-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"

const CollectorsScreen = () => {
  const insets = useSafeAreaInsets()
  const { data, isLoading, error, refetch } = useTopCollectors()
  const { refreshing, onRefresh } = usePullToRefresh(refetch)
  const { viewColors, accentColors } = useTheme()
  const { t } = useLocale()

  return (
    <View className={`${viewColors.background} flex-1`}>
      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <EmptyState
          icon='cloud-alert'
          title={t("collectors.errorTitle")}
          message={t("collectors.errorMessage")}
          actionLabel={t("collectors.errorAction")}
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={data ?? []}
          className='px-4 pt-3'
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

export default CollectorsScreen
