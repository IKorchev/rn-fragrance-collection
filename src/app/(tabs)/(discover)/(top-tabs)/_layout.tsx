import React from "react"
import { withLayoutContext } from "expo-router"
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs"
import { View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"

const { Navigator } = createMaterialTopTabNavigator()
export const MaterialTopTabs = withLayoutContext(Navigator)

export default function TopTabsLayout() {
  const { mutedColors, highlightColors, theme } = useTheme()
  const { t } = useLocale()
  return (
    <View className='flex-1'>
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: getColor(highlightColors),
          tabBarInactiveTintColor: getColor(mutedColors),
          tabBarLabelStyle: {
            fontSize: 15,
            fontWeight: "bold",
          },
          tabBarIndicatorStyle: {
            backgroundColor: getColor(highlightColors),
            height: 3,
            borderRadius: 3,
          },
          tabBarStyle: {
            backgroundColor: theme === "dark" ? getColor("zinc-950") : "white",
          },
        }}>
        {/* Top leads: it's populated for everyone, while For You stays empty
            until the user has a collection to base recommendations on */}
        <MaterialTopTabs.Screen name="index" options={{ title: t("discover.tabs.top") }} />
        <MaterialTopTabs.Screen name="recommendations" options={{ title: t("discover.tabs.forYou") }} />
        <MaterialTopTabs.Screen name="search" options={{ title: t("discover.tabs.search") }} />
      </MaterialTopTabs>
    </View>
  )
}
