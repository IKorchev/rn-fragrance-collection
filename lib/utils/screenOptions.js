import React from "react"
import { getColor } from "tailwind-rn"
import { AntDesign } from "@expo/vector-icons"
import CollectionIcon from "../../assets/Collection"
import { getHeaderTitle } from "@react-navigation/elements"
import tw from "tailwind-rn"
import Header from "../../components/Header"
import useTheme from "../../Contexts/ThemeContext"

const iconSize = 30
const screenOptions = (route) => {
  const { theme, baseColors } = useTheme()
  return {
    header: ({ route, options, navigation }) => {
      const title = getHeaderTitle(options, route.name)
      return <Header title={title} navigation={navigation} />
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
    tabBarHideOnKeyboard: true,
    tabBarShowLabel: false,
    tabBarStyle: {
      paddingHorizontal: 10,
      height: 50,
      borderTop: "5px solid black",
      borderColor: "black",
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
          : route.name === "Add" && "plussquare"

      return route.name === "Collection" ? (
        <CollectionIcon color={color} />
      ) : (
        <AntDesign
          name={iconName}
          style={[
            {
              shadowColor: baseColors,
              shadowRadius: 24,
              shadowOffset: {
                height: 20,
                width: 20,
              },
            },
            tw(""),
          ]}
          size={iconSize}
          color={color}
        />
      )
    },
  }
}

export default screenOptions
