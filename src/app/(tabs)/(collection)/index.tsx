import React, { useMemo, useState } from "react"
import {
  View,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"
import { usePullToRefresh } from "@/lib/utils/use-pull-to-refresh"
import { tagFacets } from "@/lib/utils/collection-facets"
import CollectionListItem from "@/components/collection-list-item"
import EmptyState from "@/components/shared/ui/empty-state"
import FilterChip from "@/components/shared/ui/filter-chip"
import IconButton from "@/components/shared/ui/icon-button"

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
  const { theme, viewColors, accentColors, mutedColors, baseColors, primaryBg } = useTheme()
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

  const goToSearch = () => router.navigate("/(tabs)/(discover)/(top-tabs)/search")

  if (collectionPending) {
    return (
      <View className={`flex-1 ${viewColors.background}`}>
        <ActivityIndicator size='large' color={getColor(accentColors)} className='mt-24' />
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
          <View
            className={`flex-row items-center rounded-full px-3 ${
              theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"
            }`}>
            <MaterialCommunityIcons name='magnify' size={20} color={getColor(mutedColors)} />
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder='Search your collection'
              placeholderTextColor={getColor(mutedColors)}
              autoCorrect={false}
              className='flex-1 px-2 py-2.5'
              style={{ color: getColor(baseColors) }}
            />
            {filter.length > 0 && (
              <TouchableOpacity onPress={() => setFilter("")}>
                <MaterialCommunityIcons
                  name='close-circle'
                  size={18}
                  color={getColor(mutedColors)}
                />
              </TouchableOpacity>
            )}
          </View>
          <View className='flex-row justify-evenly pt-2'>
            {SORT_OPTIONS.map(({ key, label }) => (
              <FilterChip key={key} label={label} selected={key === sort} onPress={() => setSort(key)} />
            ))}
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
      <FlatList
        data={shownCollection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        keyboardShouldPersistTaps='handled'
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
              title='No matches'
              message='Nothing in your collection matches that search.'
            />
          ) : (
            <EmptyState
              icon='bottle-tonic-outline'
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
