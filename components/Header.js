import React, { useRef } from "react"
import { Text, TouchableOpacity, View, SafeAreaView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import * as A from "react-native-animatable"
import useTheme from "../Contexts/ThemeContext"
export default function Header({ title, navigation }) {
  const { headerColors, theme, setTheme, viewColors, baseColors } = useTheme()
  const ref = useRef()

  return (
    <SafeAreaView
      style={[
        tw(
          `${headerColors.background} px-5 justify-end relative h-24 relative border-b  border-${baseColors}`
        ),
      ]}>
      <Text style={tw(`${headerColors.font} text-2xl text-center mb-2 font-bold`)}>
        {title}
      </Text>
      {title !== "Home" && (
        <TouchableOpacity
          onPress={() => navigation.jumpTo("Home")}
          style={tw("absolute left-0 top-14 flex-row items-center")}>
          <Ionicons
            name='chevron-back'
            style={tw(`ml-2 ${viewColors.font} `)}
            size={20}
          />
          <Text style={tw(`ml-2 ${viewColors.font} text-lg`)}>Home</Text>
        </TouchableOpacity>
      )}
      <View style={tw("flex-row absolute items-center right-5 top-16 -mt-1")}>
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
            style={tw(
              ` h-5 w-5 ${
                theme === "light" ? "ml-1 bg-gray-100" : "ml-6 bg-green-300"
              } rounded-full`
            )}></A.Text>
          <Ionicons
            name={theme === "dark" ? "sunny" : "moon"}
            color={getColor("yellow-300")}
            style={tw(`ml-2 absolute ${theme === "dark" ? "-left-1" : "right-1"} `)}
            size={16}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
