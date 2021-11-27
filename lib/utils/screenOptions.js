import React from "react"
import { getColor } from "tailwind-rn"
import { AntDesign, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { getHeaderTitle } from "@react-navigation/elements"
import tw from "tailwind-rn"
import Header from "../../components/Header"
import useTheme from "../../Contexts/ThemeContext"

const iconSize = 24
const screenOptions = (route) => {
  const { theme, baseColors } = useTheme()
  return {
    header: ({ route, options, navigation }) => {
      const title = getHeaderTitle(options, route.name)

      return <Header title={title} navigation={navigation} title={title} />
    },

    unmountOnBlur: true,
    tabBarActiveTintColor:
      theme === "dark" ? getColor("green-100") : getColor("green-500"),
    tabBarInactiveTintColor:
      theme === "dark" ? getColor("green-300") : getColor("gray-800"),
    tabBarLabelStyle: {
      marginTop: 15,
      fontSize: 13,
      fontWeight: "bold",
    },
    tabBarStyle: {
      paddingHorizontal: 10,
      height: 70,
      paddingBottom: 10,
      paddingTop: 5,
      borderTop: "1px solid black",
      backgroundColor: theme === "dark" ? getColor("gray-900") : "white",
    },
    tabBarIcon: ({ color }) => {
      const iconName =
        route.name === "Home"
          ? "home"
          : route.name === "Profile"
          ? "logout"
          : route.name === "Collection"
          ? "book"
          : route.name === "Add" && "pluscircleo"

      return route.name === "Log out" ? (
        <Ionicons
          name='log-out-outline'
          size={iconSize}
          style={tw("-mb-4")}
          color={color}
        />
      ) : (
        <AntDesign name={iconName} style={tw("-mb-4")} size={iconSize} color={color} />
      )
    },
  }
}

export default screenOptions
