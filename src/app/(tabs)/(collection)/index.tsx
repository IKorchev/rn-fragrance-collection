import React, { useMemo, useState } from "react"
import { View, Text, RefreshControl, ScrollView } from "react-native"
import Animated, { LinearTransition } from "react-native-reanimated"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import { tagFacets } from "@/lib/utils/collection-facets"
import CollectionListItem from "@/components/collection-list-item"
import OnboardingChecklist from "@/components/onboarding-checklist"
import EmptyState from "@/components/shared/ui/empty-state"
import { EmptyCollectionIllustration, NoResultsIllustration } from "@/components/empty-illustrations"
import FilterChip from "@/components/shared/ui/filter-chip"
import IconButton from "@/components/shared/ui/icon-button"
import NativeMenu from "@/components/shared/ui/native-menu"
import MenuChip from "@/components/shared/ui/menu-chip"
import SearchField from "@/components/shared/ui/search-field"
import SkeletonList from "@/components/shared/ui/skeleton-list"

const SORT_OPTIONS = [
  { key: "least-worn", labelKey: "collection.sort.leastWorn" },
  { key: "most-worn", labelKey: "collection.sort.mostWorn" },
  { key: "name", labelKey: "collection.sort.name" },
  { key: "recent", labelKey: "collection.sort.recent" },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]["key"]

const CollectionScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { visibleSortedCollection, collectionPending, collectionError, refetchCollection } =
    useAuth()
  const { viewColors, accentColors, mutedColors, mutedTextClass, primaryBg, onPrimaryColors } =
    useTheme()
  const { t } = useLocale()
  const { refreshing, onRefresh } = usePullToRefresh(refetchCollection)
  const [filter, setFilter] = useState("")
  const [sort, setSort] = useState<SortKey>("least-worn")
  const [tagFilter, setTagFilter] = useState<string[]>([])

  const hasCollection = visibleSortedCollection.length > 0
  const tagOptions = useMemo(() => tagFacets(visibleSortedCollection), [visibleSortedCollection])

  // visibleSortedCollection arrives least-worn-first (the picker's order);
  // the other sorts are purely client-side re-orderings of it
  const shownCollection = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    let filtered = needle
      ? visibleSortedCollection.filter((el) => el.name.toLowerCase().includes(needle))
      : visibleSortedCollection
    if (tagFilter.length) {
      filtered = filtered.filter((el) => tagFilter.some((tag) => el.tags.includes(tag)))
    }
    switch (sort) {
      case "most-worn":
        return [...filtered].reverse()
      case "name":
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
      case "recent":
        return [...filtered].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      default:
        return filtered
    }
  }, [visibleSortedCollection, filter, sort, tagFilter])

  const goToSearch = () => router.navigate("/(tabs)/(search)")

  if (collectionPending) {
    return (
      <View className={`flex-1 ${viewColors.background}`}>
        <SkeletonList />
      </View>
    )
  }

  if (collectionError) {
    return (
      <View className={`flex-1 ${viewColors.background}`}>
        <EmptyState
          icon='cloud-alert'
          title={t("collection.loadErrorTitle")}
          message={t("collection.loadErrorMessage")}
          actionLabel={t("collection.tryAgain")}
          onAction={() => refetchCollection()}
        />
      </View>
    )
  }

  return (
    <View className={`flex-1 ${viewColors.background}`}>
      {hasCollection && (
        <View className='px-3 pt-3 pb-1'>
          <SearchField
            value={filter}
            onChangeText={setFilter}
            placeholder={t("collection.searchPlaceholder")}
          />
          <View className='flex-row items-center justify-between pt-2.5 px-1'>
            <Text className={`${mutedTextClass} text-sm`}>
              {t("collection.count", { count: shownCollection.length })}
            </Text>
                        <NativeMenu
              title={t("collection.sortTitle")}
              testID='collection-sort-menu'
              items={SORT_OPTIONS.map(({ key, labelKey }) => ({
                id: key,
                title: t(labelKey),
                checked: key === sort,
                onPress: () => setSort(key),
              }))}>
              <MenuChip
                label={t(SORT_OPTIONS.find(({ key }) => key === sort)!.labelKey)}
                accessibilityLabel={t("collection.sortTitle")}
                active={sort !== "least-worn"}
              />
            </NativeMenu>
          </View>
          {tagOptions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName='pt-2 gap-2'>
              {tagOptions.map((facet) => (
                <FilterChip
                  key={facet.value}
                  label={facet.value}
                  selected={tagFilter.includes(facet.value)}
                  onPress={() =>
                    setTagFilter((prev) =>
                      prev.includes(facet.value)
                        ? prev.filter((t) => t !== facet.value)
                        : [...prev, facet.value]
                    )
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}
      {/* Animated.FlatList: deletes, undo re-inserts, and sort changes slide
          rows into place instead of snapping */}
      <Animated.FlatList
        data={shownCollection}
        itemLayoutAnimation={LinearTransition}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        keyboardShouldPersistTaps='handled'
        ListHeaderComponent={<OnboardingChecklist />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={getColor(accentColors)}
            colors={[getColor(accentColors)]}
          />
        }
        ListEmptyComponent={
          hasCollection ? (
            <EmptyState
              icon='magnify-close'
              illustration={<NoResultsIllustration />}
              title={t("collection.noMatchesTitle")}
              message={t("collection.noMatchesMessage")}
            />
          ) : (
            <EmptyState
              icon='bottle-tonic-outline'
              illustration={<EmptyCollectionIllustration />}
              title={t("collection.emptyTitle")}
              message={t("collection.emptyMessage")}
              actionLabel={t("collection.emptyAction")}
              onAction={goToSearch}
            />
          )
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          return (
            <CollectionListItem
              id={item.id}
              name={item.name}
              imageUrl={item.image_url}
              timesWorn={item.times_worn}
              lastWorn={item.last_worn}
              bottleType={item.bottle_type}
              runningLow={item.running_low}
            />
          )
        }}
      />
      {/* FAB — opens the slot-machine picker modal (pointless with nothing to pick) */}
      {hasCollection && (
        <IconButton
          bgClassName={primaryBg}
          size='xl'
          onPress={() => router.push("/picker")}
          testID='picker-fab'
          accessibilityLabel={t("collection.openPicker")}
          className='absolute right-5'
          style={{
            bottom: insets.bottom + 64,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 5,
          }}>
          <MaterialCommunityIcons name='slot-machine' size={28} color={getColor(onPrimaryColors)} />
        </IconButton>
      )}
    </View>
  )
}

export default CollectionScreen
