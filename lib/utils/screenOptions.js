import React from "react" // required for tailwind classes
import { getColor } from "tailwind-rn"
import { AntDesign, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"

import tw from "tailwind-rn"
const iconSize = 20
const screenOptions = (route) => ({
  tabBarActiveTintColor: getColor("blue-500"),
  tabBarInactiveTintColor: getColor("blue-900"),
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  tabBarStyle: {
    height: 60,
    paddingBottom: 5,
  },
  headerStyle: {
    backgroundColor: getColor("blue-200"),
  },

  tabBarIcon: ({ color }) => {
    const iconName =
      route.name === "Home"
        ? "home"
        : route.name === "Profile"
        ? "logout"
        : route.name === "Collection"
        ? "book"
        : route.name === "Pick Random"
        ? "dice"
        : route.name === "Add" && "pluscircleo"
    return route.name === "Log out" ? (
      <Ionicons
        name='log-out-outline'
        size={iconSize}
        style={tw("-mb-4")}
        color={color}
      />
    ) : route.name === "Pick Random" ? (
      <MaterialCommunityIcons
        name='dice-multiple-outline'
        size={iconSize + 5}
        style={tw("-mb-4")}
        color={color}
      />
    ) : (
      <AntDesign name={iconName} style={tw("-mb-4")} size={iconSize} color={color} />
    )
  },
})

export default screenOptions
