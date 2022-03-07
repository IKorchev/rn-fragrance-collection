import React, { useRef } from "react"
import { Text, TouchableOpacity, View, SafeAreaView, StatusBar } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import * as A from "react-native-animatable"
import { Avatar } from "react-native-elements"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"

export default function Header({ title, navigation }) {
  const { headerColors, theme, setTheme, baseColors } = useTheme()
  const { user, logOut } = useAuth()
  const ref = useRef()

  return (
    <SafeAreaView
      //prettier-ignore
      style={[tw( `${headerColors.background} flex-row  relative h-20 relative border-b  border-${baseColors}`)]}>
      <StatusBar StatusBarStyle={`light-content`} />
      <View style={tw("flex-row w-full px-5 justify-between items-center mt-5 ")}>
        <Avatar
          style={tw("h-8 w-8")}
          rounded
          source={{
            uri: user.photoURL,
          }}
          onLongPress={logOut}
        />
        <Text style={tw(`${headerColors.font} text-2xl text-center mb-2 font-bold`)}>{title}</Text>
        <View style={tw("flex-row items-center")}>
          <TouchableOpacity
            onPress={() => {
              setTheme(() => (theme === "dark" ? "light" : "dark"))
            }}
            style={tw(
              `${
                theme === "dark" ? "bg-gray-700" : "bg-gray-800"
              } h-6 justify-center rounded-full w-12`
            )}>
            <A.Text
              ref={ref}
              //prettier-ignore
              style={tw(`h-5 w-5 ${theme === "light" ? "ml-1 bg-gray-100" : "ml-6 bg-green-300"} rounded-full`)}
            />
            <Ionicons
              name={theme === "dark" ? "sunny" : "moon"}
              color={getColor("yellow-300")}
              style={tw(`ml-2 absolute ${theme === "light" ? "right-1" : "-left-1"} `)}
              size={16}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
