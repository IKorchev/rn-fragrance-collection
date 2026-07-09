import React, { useMemo, useState } from "react"
import { Chip, SearchBar } from "@rneui/themed"
import {
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
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
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import TopListItem from "@/components/top-list-item"
import FilterPickerModal from "@/components/filter-picker-modal"
import ManualAddModal from "@/components/manual-add-modal"
import EmptyState from "@/components/empty-state"

const SearchScreen = () => {
  const insets = useSafeAreaInsets()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedTerm = useDebouncedValue(searchTerm, 400)
  const [brand, setBrand] = useState<string | null>(null)
  const [openPicker, setOpenPicker] = useState<"brand" | null>(null)
  const [brandSearch, setBrandSearch] = useState("")
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const {
    viewColors,
    theme,
    baseColors,
    mutedColors,
    mutedTextClass,
    accentColors,
    cardBorderColors,
    headerColors,
  } = useTheme()

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

  const brandOptions = useMemo(() => {
    const needle = brandSearch.trim().toLowerCase()
    return (brands ?? [])
      .filter((b) => !needle || b.brand.toLowerCase().includes(needle))
      .slice(0, 100)
      .map((b) => ({ value: b.brand, count: b.fragrance_count }))
  }, [brands, brandSearch])

  const filterChipStyle = (isSelected: boolean) =>
    ({
      containerStyle: {
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: isSelected ? getColor(accentColors) : getColor(cardBorderColors),
        backgroundColor: isSelected
          ? theme === "dark"
            ? "rgba(52, 211, 153, 0.15)"
            : getColor("emerald-50")
          : undefined,
      },
      buttonStyle: { paddingHorizontal: 14, borderRadius: 9999 },
      titleStyle: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: isSelected ? getColor(accentColors) : getColor(mutedColors),
      },
    }) as const

  return (
    <KeyboardAvoidingView className={`${viewColors.background} flex-1`}>
      <SearchBar
        onSubmitEditing={() => Keyboard.dismiss()}
        showLoading={isFetching}
        containerStyle={{
          backgroundColor: getColor(headerColors.background.replace("bg-", "")),
        }}
        inputContainerStyle={{
          backgroundColor: getColor(theme === "light" ? "zinc-100" : "zinc-800"),
          borderRadius: 9999,
          paddingHorizontal: 8,
        }}
        inputStyle={{ color: getColor(baseColors) }} placeholderTextColor={getColor(mutedColors)}
        placeholder='Search name or brand'
        onChangeText={setSearchTerm}
        value={searchTerm}
      />
      <View className='py-3 flex-row justify-center w-full'>
        <Chip
          type='outline'
          {...filterChipStyle(brand !== null)}
          title={brand ?? "Filter by brand"}
          onPress={() => setOpenPicker("brand")}
        />
      </View>
      {!queryEnabled && !tooShort && (
        <Text className={`${mutedTextClass} text-center mt-6 px-6`}>
          Type a name, or filter by brand.
        </Text>
      )}
      {tooShort && (
        <Text className={`${mutedTextClass} text-center mt-6 px-6`}>
          Please enter at least {MIN_SEARCH_LENGTH} characters.
        </Text>
      )}
      {queryEnabled && isLoading && (
        <ActivityIndicator size="large" color={getColor(accentColors)} className="mt-12" />
      )}
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
