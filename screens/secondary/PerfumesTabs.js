import React from "react"
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs"
import SearchScreen from "./SearchScreen"
import TopPerfumesScreen from "./TopPerfumesScreen"
import tw, { getColor } from "tailwind-rn"
import { View, Text } from "react-native"
import useTheme from "../../Contexts/ThemeContext"
const Tab = createMaterialTopTabNavigator()

const PerfumesTabs = () => {
  const { modalColors, baseColors, theme } = useTheme()
  return (
    <View style={tw("flex-1")}>
      <Tab.Navigator
        screenOptions={({ route, navigation }) => ({
          tabBarLabelStyle: {
            color: baseColors,
            fontSize: 15,
            fontWeight: "bold",
          },
          tabBarStyle: {
            backgroundColor: theme === "dark" ? getColor("gray-700") : "white",
          },
        })}>
        <Tab.Screen name='Top 100' component={TopPerfumesScreen} />
        <Tab.Screen name='Search' component={SearchScreen} />
      </Tab.Navigator>
    </View>
  )
}
export default PerfumesTabs
