import React from "react"
import { NativeTabs } from "expo-router/unstable-native-tabs"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

export default function TabsLayout() {
  const { theme } = useTheme()
  const tintColor = theme === "dark" ? getColor("emerald-300") : getColor("emerald-600")

  return (
    <NativeTabs tintColor={tintColor}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(add)">
        <NativeTabs.Trigger.Icon sf="plus.square.fill" md="add" />
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(collection)">
        <NativeTabs.Trigger.Icon sf="drop.fill" md="fragrance" />
        <NativeTabs.Trigger.Label>Collection</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
