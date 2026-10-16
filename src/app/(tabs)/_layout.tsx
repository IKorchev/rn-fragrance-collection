import React from "react"
import { NativeTabs } from "expo-router/unstable-native-tabs"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import useGamification, { useGamificationReady } from "@/lib/utils/use-gamification"
import useGamificationAlerts from "@/lib/utils/use-gamification-alerts"
import useStreakSaver from "@/lib/utils/use-streak-saver"
import useProfileSync from "@/lib/utils/use-profile-sync"
import useQuickActions from "@/lib/utils/use-quick-actions"

export default function TabsLayout() {
  const { tabBarBackgroundColor, highlightColors, highlightTintBg } = useTheme()
  const tintColor = getColor(highlightColors)
  const { t } = useLocale()

  // Mounted once for the whole signed-in session (all 3 tabs share this
  // layout), so a badge-unlock toast fires regardless of which tab
  // is active rather than only when the Profile tab happens to be open.
  const gamification = useGamification()
  const gamificationReady = useGamificationReady()
  useGamificationAlerts(gamification, gamificationReady)
  // Detects a just-broken streak on app open and either auto-spends a Pro
  // Streak Saver or shows the free-tier upsell (see src/lib/utils/use-streak-saver.ts)
  useStreakSaver()
  // Mirrors the state above into the user's public profile row (no-op while private)
  useProfileSync(gamification)
  useQuickActions()

  return (
    <NativeTabs tintColor={tintColor} backgroundColor={tabBarBackgroundColor} indicatorColor={highlightTintBg}>
      <NativeTabs.Trigger name="(discover)">
        <NativeTabs.Trigger.Icon sf="safari.fill" md="explore" />
        <NativeTabs.Trigger.Label>{t("discover.title")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(collection)">
        <NativeTabs.Trigger.Icon sf="drop.fill" md="fragrance" />
        <NativeTabs.Trigger.Label>{t("collection.title")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
        <NativeTabs.Trigger.Label>{t("profile.title")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
