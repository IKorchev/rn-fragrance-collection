import React from "react"
import { Stack } from "expo-router"
import useLocale from "@/contexts/locale-context"
import { useNativeHeaderOptions } from "@/lib/utils/use-native-header-options"

export default function DiscoverLayout() {
  const { t } = useLocale()
  const headerOptions = useNativeHeaderOptions()

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="(top-tabs)" options={{ title: t("discover.title"), headerLargeTitle: true }} />
    </Stack>
  )
}
