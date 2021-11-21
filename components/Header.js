import React, { useRef } from "react"
import { Text, TouchableOpacity, View, SafeAreaView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "tailwind-rn"
import * as A from "react-native-animatable"
import useTheme from "../Contexts/ThemeContext"
export default function Header({ title, navigation }) {
  const { headerColors, theme, setTheme, viewColors } = useTheme()
  const ref = useRef()

  return (
    <SafeAreaView
      style={[
        tw(
          `${headerColors.background} px-5 justify-end relative h-24 relative border-b border-white`
        ),
      ]}>
      <Text style={tw(`${headerColors.font} text-2xl text-center mb-2 font-bold`)}>
        {title}
      </Text>

      <View style={tw("flex-row absolute items-center right-5 top-16 -mt-1")}>
        <TouchableOpacity
          onPress={() => {
            setTheme(() => (theme === "dark" ? "light" : "dark"))
          }}
          style={tw("bg-black h-4 justify-center rounded-full w-10")}>
          <A.Text
            ref={ref}
            style={tw(
              ` h-6 w-6 ${
                theme === "light" ? "ml-0 bg-gray-300" : "ml-4 bg-green-300"
              } rounded-full`
            )}></A.Text>
        </TouchableOpacity>
        <Ionicons
          name={theme === "dark" ? "sunny" : "moon-outline"}
          style={tw(`ml-2 ${viewColors.font}`)}
          size={24}
        />
      </View>
    </SafeAreaView>
  )
}
