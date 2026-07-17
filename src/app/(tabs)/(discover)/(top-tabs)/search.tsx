import React, { useEffect, useMemo, useState } from "react"
import {
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import {
  useFragranceSearch,
  useFragranceRatings,
  useBrands,
  hasActiveFilters,
  MIN_SEARCH_LENGTH,
  type SearchFilters,
} from "@/lib/queries"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useDebouncedValue } from "@/lib/utils/use-debounced-value"
import { useRecentSearches } from "@/lib/utils/use-recent-searches"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import TopListItem from "@/components/top-list-item"
import FilterPickerModal from "@/components/filter-picker-modal"
import ManualAddModal from "@/components/manual-add-modal"
import EmptyState from "@/components/shared/ui/empty-state"
import { NoResultsIllustration } from "@/components/empty-illustrations"
import FilterChip from "@/components/shared/ui/filter-chip"
import PressableScale from "@/components/shared/ui/pressable-scale"
import SearchField from "@/components/shared/ui/search-field"
import SkeletonList from "@/components/shared/ui/skeleton-list"

const SearchScreen = () => {
  const insets = useSafeAreaInsets()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedTerm = useDebouncedValue(searchTerm, 400)
  const [brand, setBrand] = useState<string | null>(null)
  const [openPicker, setOpenPicker] = useState<"brand" | null>(null)
  const [brandSearch, setBrandSearch] = useState("")
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const { viewColors, mutedColors, accentColors, baseBorderClass, pill, mutedTextClass } = useTheme()
  const recentSearches = useRecentSearches()

  const filters: SearchFilters = { brand }
  const { data, isFetching, isLoading, error, refetch } = useFragranceSearch(
    debouncedTerm,
    filters
  )
  const { data: brands, isLoading: brandsLoading } = useBrands()
  const { data: ratings } = useFragranceRatings((data ?? []).map((item) => item.id))

  const trimmedLength = debouncedTerm.trim().length
  const filtersActive = hasActiveFilters(filters)
  const queryEnabled = trimmedLength >= MIN_SEARCH_LENGTH || filtersActive
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_SEARCH_LENGTH && !filtersActive

  // Record a term once it actually produces a query (not on every keystroke,
  // and not brand-only browsing — "recent searches" means typed terms)
  useEffect(() => {
    if (trimmedLength >= MIN_SEARCH_LENGTH) recentSearches.add(debouncedTerm.trim())
  }, [debouncedTerm])

  const brandOptions = useMemo(() => {
    const needle = brandSearch.trim().toLowerCase()
    return (brands ?? [])
      .filter((b) => !needle || b.brand.toLowerCase().includes(needle))
      .slice(0, 100)
      .map((b) => ({ value: b.brand, count: b.fragrance_count }))
  }, [brands, brandSearch])

  const resultsLabel =
    data && data.length > 0
      ? `${data.length.toLocaleString()} result${data.length === 1 ? "" : "s"}${
          brand ? ` in ${brand}` : ""
        }`
      : null

  // Recent-search popover: shows while the field is focused and empty (the
  // classic "tap in, see your history" pattern), regardless of what's
  // underneath — a brand-only browse result, the idle prompt, whatever.
  const showRecentDropdown =
    searchFocused && searchTerm.trim().length === 0 && recentSearches.terms.length > 0

  const pickRecent = (term: string) => {
    setSearchTerm(term)
    Keyboard.dismiss()
  }

  return (
    <KeyboardAvoidingView className={`${viewColors.background} flex-1`}>
      <View className={`px-3 pt-3 ${brand ? "" : "pb-3"} flex-row items-center`} style={{ gap: 8 }}>
        <View className='flex-1'>
          <SearchField
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder='Search name or brand'
            onSubmitEditing={() => Keyboard.dismiss()}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
        {/* Filter entry point — a plain icon button rather than a chip so it
            reads as a control next to the search field, not a second search
            box; turns tinted once a brand is active (the active state itself
            is surfaced by the removable chip below, not by this button) */}
        <PressableScale
          onPress={() => setOpenPicker("brand")}
          testID='open-brand-filter'
          className={`h-11 w-11 items-center justify-center rounded-full ${
            brand ? pill.tintBg : `border ${baseBorderClass}`
          }`}>
          <MaterialCommunityIcons
            name='filter-variant'
            size={22}
            color={getColor(brand ? accentColors : mutedColors)}
          />
        </PressableScale>
      </View>
      {brand && (
        <View className='px-3 pb-3 flex-row items-center' style={{ gap: 6 }}>
          <FilterChip
            label={brand}
            selected
            paddingHorizontal={14}
            onPress={() => setOpenPicker("brand")}
          />
          <TouchableOpacity onPress={() => setBrand(null)} hitSlop={8} testID='clear-brand-filter'>
            <MaterialCommunityIcons name='close-circle' size={20} color={getColor(mutedColors)} />
          </TouchableOpacity>
        </View>
      )}

      <View className='flex-1' style={{ position: "relative" }}>
        {!queryEnabled && !tooShort && (
          <EmptyState
            icon='text-search'
            title='Search the catalog'
            message='Type a name or brand, or filter by brand above.'
          />
        )}
        {tooShort && (
          <Text className={`${mutedTextClass} text-center mt-6 px-6`}>
            Please enter at least {MIN_SEARCH_LENGTH} characters.
          </Text>
        )}
        {queryEnabled && isLoading && <SkeletonList />}
        {queryEnabled && !isLoading && error && (
          <EmptyState
            icon='cloud-alert'
            title='Search failed'
            message='Check your connection and try again.'
            actionLabel='Try again'
            onAction={() => refetch()}
          />
        )}
        {queryEnabled && !isLoading && !error && data && data.length === 0 && (
          <EmptyState
            icon='magnify-close'
            illustration={<NoResultsIllustration />}
            title='No results found'
            message="The catalog doesn't have everything — you can add it yourself."
            actionLabel='Add manually'
            onAction={() => setManualAddOpen(true)}
          />
        )}
        {queryEnabled && !isLoading && !error && data && data.length > 0 && (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{ paddingBottom: insets.bottom }}
            ListHeaderComponent={
              resultsLabel ? (
                <Text className={`${mutedTextClass} text-sm px-4 pb-2`}>
                  {resultsLabel}
                  {isFetching ? " · updating…" : ""}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TopListItem
                name={`${item.brand} - ${item.name}`}
                imageUrl={item.image_url}
                fragranceId={item.id}
                avgRating={ratings?.[item.id]?.avg}
                ratingCount={ratings?.[item.id]?.count}
              />
            )}
            ListFooterComponent={
              <TouchableOpacity onPress={() => setManualAddOpen(true)} className='py-4'>
                <Text className={`${mutedTextClass} text-center text-sm`}>
                  Can't find it? <Text className='font-semibold'>Add manually</Text>
                </Text>
              </TouchableOpacity>
            }
          />
        )}

        {/* Recent-search popover — sits above whatever's rendered underneath
            (idle prompt, brand-browse results, ...) while the field is
            focused and empty. The outer Pressable is the tap-outside-to-
            dismiss backdrop; the inner one stops taps on the card itself
            from bubbling into it (same pattern as Dialog.tsx). */}
        {showRecentDropdown && (
          <Pressable
            onPress={() => Keyboard.dismiss()}
            className={`${viewColors.background} absolute inset-0`}>
            <Pressable onPress={() => {}} className='px-6 pt-6'>
              <View className='flex-row items-center justify-between pb-2'>
                <Text className={`${mutedTextClass} text-xs font-semibold uppercase`}>
                  Recent searches
                </Text>
                <TouchableOpacity onPress={recentSearches.clear} hitSlop={8}>
                  <Text className={`${mutedTextClass} text-xs`}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View className='flex-row flex-wrap' style={{ gap: 8 }}>
                {recentSearches.terms.map((term) => (
                  <FilterChip
                    key={term}
                    label={term}
                    selected={false}
                    onPress={() => pickRecent(term)}
                  />
                ))}
              </View>
            </Pressable>
          </Pressable>
        )}
      </View>
      <ManualAddModal
        visible={manualAddOpen}
        initialTitle={debouncedTerm.trim()}
        onClose={() => setManualAddOpen(false)}
      />
      <FilterPickerModal
        visible={openPicker === "brand"}
        title='Brand'
        options={brandOptions}
        loading={brandsLoading}
        searchValue={brandSearch}
        onSearchChange={setBrandSearch}
        multiSelect={false}
        selected={brand ? [brand] : []}
        onToggle={(value) => setBrand(value === brand ? null : value)}
        onClear={() => setBrand(null)}
        onClose={() => setOpenPicker(null)}
      />
    </KeyboardAvoidingView>
  )
}

export default SearchScreen
