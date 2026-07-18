import React from "react"
import { Stack } from "expo-router"
import { getHeaderTitle } from "expo-router/react-navigation"
import Header from "@/components/header"
import useLocale from "@/contexts/locale-context"

export default function ProfileLayout() {
  const { t } = useLocale()

  return (
    <Stack
      screenOptions={{
        header: ({ route, options, navigation }) => (
          <Header title={getHeaderTitle(options, route.name)} navigation={navigation} />
        ),
      }}>
      <Stack.Screen name="index" options={{ title: t("profile.title") }} />
    </Stack>
  )
}
