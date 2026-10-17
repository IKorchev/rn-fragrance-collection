import React from "react"
import { TouchableOpacity } from "react-native"
import { Stack, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import useLocale from "@/contexts/locale-context"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"
import { useNativeHeaderOptions } from "@/lib/utils/use-native-header-options"

export default function ProfileLayout() {
  const { t } = useLocale()
  const { headerColors } = useTheme()
  const router = useRouter()
  const headerOptions = useNativeHeaderOptions()

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t("profile.title"),
          headerLargeTitle: true,
          headerRight: () => (
            <TouchableOpacity
              testID='profile-settings-button'
              onPress={() => router.push("/settings")}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel={t("screens.settings")}>
              <Ionicons name='settings-outline' size={24} color={getColor(headerColors.font.replace("text-", ""))} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: t("screens.settings") }} />
    </Stack>
  )
}
