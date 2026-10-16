import React from "react"
import { TouchableOpacity } from "react-native"
import { Stack, useRouter } from "expo-router"
import { getHeaderTitle } from "expo-router/react-navigation"
import { Ionicons } from "@expo/vector-icons"
import Header from "@/components/header"
import useLocale from "@/contexts/locale-context"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"

export default function ProfileLayout() {
  const { t } = useLocale()
  const { headerColors } = useTheme()
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
        header: ({ route, options, navigation, back }) => (
          <Header
            title={getHeaderTitle(options, route.name)}
            navigation={navigation}
            back={back}
            right={options.headerRight?.({ canGoBack: !!back })}
          />
        ),
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: t("profile.title"),
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
