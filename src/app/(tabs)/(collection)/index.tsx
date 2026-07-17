import React, { useMemo, useState } from "react"
import { View, Text, TouchableOpacity, RefreshControl } from "react-native"
import Animated, { LinearTransition } from "react-native-reanimated"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import CollectionListItem from "@/components/collection-list-item"
import OnboardingChecklist from "@/components/onboarding-checklist"
import Dialog from "@/components/shared/ui/dialog"
import EmptyState from "@/components/shared/ui/empty-state"
import { EmptyCollectionIllustration, NoResultsIllustration } from "@/components/empty-illustrations"
import FilterChip from "@/components/shared/ui/filter-chip"
import IconButton from "@/components/shared/ui/icon-button"
import SearchField from "@/components/shared/ui/search-field"
import SkeletonList from "@/components/shared/ui/skeleton-list"

const SORT_OPTIONS = [
  { key: "least-worn", label: "Least worn" },
  { key: "most-worn", label: "Most worn" },
  { key: "name", label: "A–Z" },
  { key: "recent", label: "Recent" },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]["key"]

const CollectionScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { visibleSortedCollection, collectionPending, collectionError, refetchCollection } =
    useAuth()
  const {
    viewColors,
    accentColors,
    mutedColors,
    baseTextClass,
    accentTextClass,
    mutedTextClass,
    primaryBg,
  } = useTheme()
  const { refreshing, onRefresh } = usePullToRefresh(refetchCollection)
  const [filter, setFilter] = useState("")
  const [sort, setSort] = useState<SortKey>("least-worn")
  const [sortPickerOpen, setSortPickerOpen] = useState(false)

  const hasCollection = visibleSortedCollection.length > 0

  // visibleSortedCollection arrives least-worn-first (the picker's order);
  // the other sorts are purely client-side re-orderings of it
  const shownCollection = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const filtered = needle
      ? visibleSortedCollection.filter((el) => el.name.toLowerCase().includes(needle))
      : visibleSortedCollection
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
  }, [visibleSortedCollection, filter, sort])

  const goToSearch = () => router.navigate("/(tabs)/(discover)/(top-tabs)/search")

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
          title="Couldn't load your collection"
          message='Check your connection and try again.'
          actionLabel='Try again'
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
            placeholder='Search your collection'
          />
          <View className='flex-row items-center justify-between pt-2.5 px-1'>
            <Text className={`${mutedTextClass} text-sm`}>
              {shownCollection.length} {shownCollection.length === 1 ? "fragrance" : "fragrances"}
            </Text>
            <FilterChip
              label={SORT_OPTIONS.find(({ key }) => key === sort)!.label}
              selected={sort !== "least-worn"}
              onPress={() => setSortPickerOpen(true)}
            />
          </View>
        </View>
      )}
      <Dialog visible={sortPickerOpen} title='Sort by' onClose={() => setSortPickerOpen(false)}>
        {SORT_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            className='flex-row items-center justify-between py-3'
            onPress={() => {
              setSort(key)
              setSortPickerOpen(false)
            }}>
            <Text className={key === sort ? `${accentTextClass} font-semibold` : baseTextClass}>
              {label}
            </Text>
            {key === sort && (
              <MaterialCommunityIcons name='check' size={18} color={getColor(accentColors)} />
            )}
          </TouchableOpacity>
        ))}
      </Dialog>
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
              title='No matches'
              message='Nothing in your collection matches that search.'
            />
          ) : (
            <EmptyState
              icon='bottle-tonic-outline'
              illustration={<EmptyCollectionIllustration />}
              title='Your collection is empty'
              message='Find fragrances in the catalog and add them to start tracking your wears.'
              actionLabel='Find fragrances'
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
          className='absolute right-5'
          style={{
            bottom: insets.bottom + 64,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 5,
          }}>
          <MaterialCommunityIcons name='slot-machine' size={28} color='white' />
        </IconButton>
      )}
    </View>
  )
}

export default CollectionScreen
