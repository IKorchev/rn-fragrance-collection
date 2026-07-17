import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import { showInterstitial } from "@/lib/ads"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { buildPickerResultShareText } from "@/lib/share"
import Picker from "@/components/picker"
import ShareSheetModal from "@/components/share-sheet-modal"

const PickerScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { frag, index, isPro } = useAuth()
  const { viewColors, mutedColors } = useTheme()
  const { t } = useLocale()
  const [shareVisible, setShareVisible] = useState(false)
  const shareMessage = useMemo(
    () => (frag ? buildPickerResultShareText(t, { name: frag.name }) : ""),
    [t, frag]
  )

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
      {frag && (
        <TouchableOpacity
          className='absolute left-4 z-10 h-10 w-10 items-center justify-center'
          style={{ top: insets.top + 8 }}
          accessibilityRole='button'
          accessibilityLabel={t("share.action")}
          testID='picker-share'
          onPress={() => setShareVisible(true)}>
          <MaterialCommunityIcons name='share-variant' size={24} color={getColor(mutedColors)} />
        </TouchableOpacity>
      )}
      <View className='flex-1 justify-center'>
        <Picker fragrance={frag} index={index} />
      </View>

      <ShareSheetModal
        visible={shareVisible}
        title={t("share.sheetTitlePicker")}
        message={shareMessage}
        onClose={() => setShareVisible(false)}
      />
    </View>
  )
}

export default PickerScreen
