import React from "react"
import { withLayoutContext } from "expo-router"
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs"
import { View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

const { Navigator } = createMaterialTopTabNavigator()
export const MaterialTopTabs = withLayoutContext(Navigator)

export default function TopTabsLayout() {
  const { baseColors, mutedColors, accentColors, theme } = useTheme()
  return (
    <View className='flex-1'>
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: getColor(baseColors),
          tabBarInactiveTintColor: getColor(mutedColors),
          tabBarLabelStyle: {
            fontSize: 15,
            fontWeight: "bold",
          },
          tabBarIndicatorStyle: {
            backgroundColor: getColor(accentColors),
            height: 3,
            borderRadius: 3,
          },
          tabBarStyle: {
            backgroundColor: theme === "dark" ? getColor("zinc-950") : "white",
          },
        }}>
        <MaterialTopTabs.Screen name="index" options={{ title: "Top 100" }} />
        <MaterialTopTabs.Screen name="search" options={{ title: "Search" }} />
      </MaterialTopTabs>
    </View>
  )
}
