import React from "react"
import { NativeTabs } from "expo-router/unstable-native-tabs"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

export default function TabsLayout() {
  const { theme, tabBarBackgroundColor, accentTintBg } = useTheme()
  const tintColor = theme === "dark" ? getColor("emerald-300") : getColor("emerald-600")

  return (
    <NativeTabs tintColor={tintColor} backgroundColor={tabBarBackgroundColor} indicatorColor={accentTintBg}>
      <NativeTabs.Trigger name="(discover)">
        <NativeTabs.Trigger.Icon sf="safari.fill" md="explore" />
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(collection)">
        <NativeTabs.Trigger.Icon sf="drop.fill" md="fragrance" />
        <NativeTabs.Trigger.Label>Collection</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
