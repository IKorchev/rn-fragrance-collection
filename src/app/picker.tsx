import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import { showInterstitial } from "@/lib/ads"
import { promptProUpsell } from "@/lib/entitlements"
import { tagFacets, brandFacets } from "@/lib/utils/collection-facets"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import Picker from "@/components/picker"
import PickerFilterSheet from "@/components/picker-filter-sheet"

const PickerScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { frag, index, isPro, userCollection, pickerFilters, setPickerFilters, pickerHasActiveFilters } =
    useAuth()
  const { viewColors, mutedColors, accentColors, accentTintBg } = useTheme()
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const tagOptions = useMemo(() => tagFacets(userCollection), [userCollection])
  const brandOptions = useMemo(() => brandFacets(userCollection), [userCollection])

  // Interstitial on close (X button or Android hardware back — unmount
  // catches both). Pro removes ads. Ref so upgrading mid-picker is honored.
  // Deferred: launching the ad activity while the modal-dismiss transition
  // is still running intermittently aborts the presentation.
  const isProRef = useRef(isPro)
  isProRef.current = isPro
  useEffect(
    () => () => {
      if (!isProRef.current) setTimeout(showInterstitial, 400)
    },
    []
  )

  const handleFilterPress = () => {
    if (!isPro) {
      promptProUpsell(
        "Picker filters are a Pro feature",
        "Upgrade to Pro to narrow the picker by tag, brand, or unworn-only."
      )
      return
    }
    setFilterSheetOpen(true)
  }

  return (
    <View className={`${viewColors.background} flex-1`}>
      {/* Presented as fullScreenModal (no swipe-to-dismiss — a sheet would
          steal the lever's drag-down gesture) — the X is the way out */}
      <TouchableOpacity
        className='absolute right-4 z-10 h-10 w-10 items-center justify-center'
        style={{ top: insets.top + 8 }}
        testID='picker-close'
        onPress={() => router.back()}>
        <AntDesign name='close' size={26} color={getColor(mutedColors)} />
      </TouchableOpacity>
      <TouchableOpacity
        className='absolute left-4 z-10 flex-row items-center rounded-full px-3 py-2'
        style={{
          top: insets.top + 8,
          backgroundColor: pickerHasActiveFilters ? accentTintBg : undefined,
        }}
        testID='picker-filter-button'
        accessibilityLabel={
          isPro ? "Filter picker" : "Picker filters — Pro feature"
        }
        onPress={handleFilterPress}>
        <MaterialCommunityIcons
          name={isPro ? "tune-variant" : "lock-outline"}
          size={18}
          color={pickerHasActiveFilters ? getColor(accentColors) : getColor(mutedColors)}
        />
        {pickerHasActiveFilters && (
          <Text className='text-xs font-semibold pl-1' style={{ color: getColor(accentColors) }}>
            Filtered
          </Text>
        )}
      </TouchableOpacity>
      <View className='flex-1 justify-center'>
        <Picker fragrance={frag} index={index} />
      </View>
      {isPro && (
        <PickerFilterSheet
          visible={filterSheetOpen}
          filters={pickerFilters}
          tagFacets={tagOptions}
          brandFacets={brandOptions}
          onChange={setPickerFilters}
          onClose={() => setFilterSheetOpen(false)}
        />
      )}
    </View>
  )
}

export default PickerScreen
