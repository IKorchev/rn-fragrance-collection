import React, { type ReactNode } from "react"
import { Text, TouchableOpacity, View, StatusBar } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"

interface HeaderProps {
  title: string
  navigation?: { goBack: () => void }
  // Present when there's a previous screen to go back to (React Navigation's
  // header render prop) — regular pushed screens (wear history, legal docs)
  // get a back chevron; tab roots don't pass this.
  back?: { title?: string }
  // Trailing action slot (user-profile's overflow menu, set per screen via
  // the headerRight option)
  right?: ReactNode
}

export default function Header({ title, navigation, back, right }: HeaderProps) {
  const { headerColors, cardBorderColors, theme } = useTheme()
  const { t } = useLocale()

  return (
    // Background/border via explicit style, not className — the navigator's
    // header slot repaints outside NativeWind's remount path, so classes on
    // this root element don't reliably re-apply on theme change.
    <SafeAreaView
      edges={["top"]}
      style={{
        backgroundColor: getColor(headerColors.background.replace("bg-", "")),
        borderBottomWidth: 1,
        borderBottomColor: getColor(cardBorderColors),
      }}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      <View className='flex-row w-full px-5 pb-3 pt-2 items-center'>
        {back && (
          <TouchableOpacity
            testID='header-back'
            onPress={() => navigation?.goBack()}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t("common.back")}
            className='mr-2 -ml-1'>
            <Ionicons
              name='chevron-back'
              size={26}
              color={getColor(headerColors.font.replace("text-", ""))}
            />
          </TouchableOpacity>
        )}
        <Text
          accessibilityRole='header'
          className={`${headerColors.font} font-display text-2xl flex-1`}
          numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
    </SafeAreaView>
  )
}
