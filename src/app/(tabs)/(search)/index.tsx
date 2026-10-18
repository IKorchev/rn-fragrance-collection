import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Stack } from "expo-router"
import type { SearchBarCommands } from "react-native-screens"
import {
  useFragranceSearch,
  useFragranceRatings,
  useBrands,
  hasActiveFilters,
  MIN_SEARCH_LENGTH,
  type SearchFilters,
} from "@/lib/queries"
import { useTabBottomPadding } from "@/lib/utils/use-tab-bottom-padding"
import { useDebouncedValue } from "@/lib/utils/use-debounced-value"
import { useRecentSearches } from "@/lib/utils/use-recent-searches"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import TopListItem from "@/components/top-list-item"
import SearchBrowse from "@/components/search-browse"
import FilterPickerModal from "@/components/filter-picker-modal"
import ManualAddModal from "@/components/manual-add-modal"
import EmptyState from "@/components/shared/ui/empty-state"
import { NoResultsIllustration } from "@/components/empty-illustrations"
import FilterChip from "@/components/shared/ui/filter-chip"
import PressableScale from "@/components/shared/ui/pressable-scale"
import SearchField from "@/components/shared/ui/search-field"
import SkeletonList from "@/components/shared/ui/skeleton-list"

// iOS gets the system search bar (headerSearchBarOptions — on iOS 26 it docks
// into the role="search" tab's slot in the tab bar) with the brand filter as a
// header bar button. A large-title header lays the screen out *under* the
// navigation bar, so on iOS everything below has to live inside a scroll view
// with automatic content insets — a plain View above the list ends up hidden
// behind the title. Android keeps the in-content field row.
const NATIVE_SEARCH_BAR = Platform.OS === "ios"

const SearchScreen = () => {
  const bottomPadding = useTabBottomPadding()
  const searchBarRef = useRef<SearchBarCommands>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedTerm = useDebouncedValue(searchTerm, 400)
  const [brand, setBrand] = useState<string | null>(null)
  const [openPicker, setOpenPicker] = useState<"brand" | null>(null)
  const [brandSearch, setBrandSearch] = useState("")
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const { viewColors, mutedColors, baseColors, onPrimaryColors, controlFillBg, primaryBg, mutedTextClass } =
    useTheme()
  const recentSearches = useRecentSearches()
  const { t } = useLocale()

  const filters: SearchFilters = { brand }
  const { data, isFetching, isLoading, error, refetch } = useFragranceSearch(debouncedTerm, filters)
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
      ? brand
        ? t("search.resultsInBrand", { count: data.length, brand })
        : t("search.results", { count: data.length })
      : null

  // Recent-search popover: shows while the field is focused and empty (the
  // classic "tap in, see your history" pattern), regardless of what's
  // underneath — a brand-only browse result, the idle prompt, whatever.
  const showRecentDropdown =
    searchFocused && searchTerm.trim().length === 0 && recentSearches.terms.length > 0

  const pickRecent = (term: string) => {
    setSearchTerm(term)
    searchBarRef.current?.setText(term)
    searchBarRef.current?.blur()
    Keyboard.dismiss()
  }

  const brandFilterLabel = brand ? t("search.brandFilterActive", { brand }) : t("search.filterByBrand")

  // Active brand: a removable chip at the top of whatever's showing
  const brandChip = brand ? (
    <View className={`px-3 ${NATIVE_SEARCH_BAR ? "pt-3" : ""} pb-3 flex-row items-center`} style={{ gap: 6 }}>
      <FilterChip label={brand} selected paddingHorizontal={14} onPress={() => setOpenPicker("brand")} />
      <TouchableOpacity
        onPress={() => setBrand(null)}
        hitSlop={8}
        testID='clear-brand-filter'
        accessibilityRole='button'
        accessibilityLabel={t("search.clearBrandFilter")}>
        <MaterialCommunityIcons name='close-circle' size={20} color={getColor(mutedColors)} />
      </TouchableOpacity>
    </View>
  ) : null

  const showResults = queryEnabled && !isLoading && !error && !!data && data.length > 0

  // Everything that isn't the results list or the browse sections: a short
  // status (too short / loading / error / no results) under the brand chip
  const statusContent = tooShort ? (
    <Text className={`${mutedTextClass} text-center mt-6 px-6`}>
      {t("search.tooShort", { count: MIN_SEARCH_LENGTH })}
    </Text>
  ) : queryEnabled && isLoading ? (
    <SkeletonList />
  ) : queryEnabled && error ? (
    <EmptyState
      icon='cloud-alert'
      title={t("search.errorTitle")}
      message={t("collection.loadErrorMessage")}
      actionLabel={t("collection.tryAgain")}
      onAction={() => refetch()}
    />
  ) : queryEnabled && data && data.length === 0 ? (
    <EmptyState
      icon='magnify-close'
      illustration={<NoResultsIllustration />}
      title={t("search.noResultsTitle")}
      message={t("search.noResultsMessage")}
      actionLabel={t("search.addManually")}
      onAction={() => setManualAddOpen(true)}
    />
  ) : null

  return (
    <KeyboardAvoidingView className={`${viewColors.background} flex-1`}>
      {NATIVE_SEARCH_BAR && (
        <Stack.Screen
          options={{
            headerSearchBarOptions: {
              ref: searchBarRef,
              placeholder: t("search.placeholder"),
              autoCapitalize: "none",
              hideWhenScrolling: false,
              obscureBackground: false,
              onChangeText: (e) => setSearchTerm(e.nativeEvent.text),
              onCancelButtonPress: () => setSearchTerm(""),
              onFocus: () => setSearchFocused(true),
              onBlur: () => setSearchFocused(false),
            },
            headerRight: () => (
              <TouchableOpacity
                onPress={() => setOpenPicker("brand")}
                hitSlop={8}
                testID='open-brand-filter'
                accessibilityRole='button'
                accessibilityLabel={brandFilterLabel}>
                <MaterialCommunityIcons
                  name={brand ? "filter" : "filter-variant"}
                  size={24}
                  color={getColor(baseColors)}
                />
              </TouchableOpacity>
            ),
          }}
        />
      )}
      {!NATIVE_SEARCH_BAR && (
        <View className={`px-3 pt-3 ${brand ? "" : "pb-3"} flex-row items-center`} style={{ gap: 8 }}>
          <View className='flex-1'>
            <SearchField
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder={t("search.placeholder")}
              onSubmitEditing={() => Keyboard.dismiss()}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
          {/* Filter entry point — a plain icon button rather than a chip so it
              reads as a control next to the search field, not a second search
              box; turns solid once a brand is active (the active state itself
              is surfaced by the removable chip below, not by this button) */}
          <PressableScale
            onPress={() => setOpenPicker("brand")}
            testID='open-brand-filter'
            accessibilityLabel={brandFilterLabel}
            className={`h-11 w-11 items-center justify-center rounded-full ${brand ? primaryBg : ""}`}
            style={brand ? undefined : { backgroundColor: controlFillBg }}>
            <MaterialCommunityIcons
              name='filter-variant'
              size={22}
              color={getColor(brand ? onPrimaryColors : baseColors)}
            />
          </PressableScale>
        </View>
      )}
      {!NATIVE_SEARCH_BAR && brandChip}

      <View className='flex-1' style={{ position: "relative" }}>
        {/* Idle: browse sections (they step aside once there's a query) */}
        {!queryEnabled && !tooShort && <SearchBrowse onPickBrand={setBrand} />}
        {!showResults && (queryEnabled || tooShort) && (
          <ScrollView
            contentInsetAdjustmentBehavior='automatic'
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'>
            {NATIVE_SEARCH_BAR && brandChip}
            {statusContent}
          </ScrollView>
        )}
        {showResults && (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior='automatic'
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'
            contentContainerStyle={{ paddingBottom: bottomPadding }}
            ListHeaderComponent={
              <>
                {NATIVE_SEARCH_BAR && brandChip}
                {resultsLabel ? (
                  <Text className={`${mutedTextClass} text-sm px-4 pb-2`}>
                    {resultsLabel}
                    {isFetching ? ` · ${t("search.updating")}` : ""}
                  </Text>
                ) : null}
              </>
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
                  {t("search.cantFindIt")} <Text className='font-semibold'>{t("search.addManually")}</Text>
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
          <ScrollView
            contentInsetAdjustmentBehavior='automatic'
            keyboardShouldPersistTaps='handled'
            className={`${viewColors.background} absolute inset-0`}
            contentContainerStyle={{ flexGrow: 1 }}>
            <Pressable onPress={() => Keyboard.dismiss()} className='flex-1'>
              <Pressable onPress={() => {}} className='px-6 pt-6'>
                <View className='flex-row items-center justify-between pb-2'>
                  <Text className={`${mutedTextClass} text-xs font-semibold uppercase`}>
                    {t("search.recentSearches")}
                  </Text>
                  <TouchableOpacity onPress={recentSearches.clear} hitSlop={8}>
                    <Text className={`${mutedTextClass} text-xs`}>{t("diary.clear")}</Text>
                  </TouchableOpacity>
                </View>
                <View className='flex-row flex-wrap' style={{ gap: 8 }}>
                  {recentSearches.terms.map((term) => (
                    <FilterChip key={term} label={term} selected={false} onPress={() => pickRecent(term)} />
                  ))}
                </View>
              </Pressable>
            </Pressable>
          </ScrollView>
        )}
      </View>
      <ManualAddModal
        visible={manualAddOpen}
        initialTitle={debouncedTerm.trim()}
        onClose={() => setManualAddOpen(false)}
      />
      <FilterPickerModal
        visible={openPicker === "brand"}
        title={t("diary.brand")}
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
