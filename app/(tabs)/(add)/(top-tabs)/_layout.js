import React from "react"
import { withLayoutContext } from "expo-router"
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs"
import { View } from "react-native"
import { getColor } from "../../../../lib/utils/colors"
import useTheme from "../../../../Contexts/ThemeContext"

const { Navigator } = createMaterialTopTabNavigator()
export const MaterialTopTabs = withLayoutContext(Navigator)

export default function TopTabsLayout() {
  const { baseColors, theme } = useTheme()
  return (
    <View className='flex-1'>
      <MaterialTopTabs
        screenOptions={{
          tabBarLabelStyle: {
            color: baseColors,
            fontSize: 15,
            fontWeight: "bold",
          },
          tabBarStyle: {
            backgroundColor: theme === "dark" ? getColor("gray-700") : "white",
          },
        }}>
        <MaterialTopTabs.Screen name="index" options={{ title: "Top 100" }} />
        <MaterialTopTabs.Screen name="search" options={{ title: "Search" }} />
      </MaterialTopTabs>
    </View>
  )
}
