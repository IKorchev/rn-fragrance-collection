import React, { useRef } from "react"
import {
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Image,
  StatusBar,
} from "react-native"
import { Ionicons, SimpleLineIcons } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import * as A from "react-native-animatable"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"
export default function Header({ title, navigation }) {
  const { headerColors, theme, setTheme, baseColors } = useTheme()
  const ref = useRef()

  return (
    <SafeAreaView
      style={[
        tw(
          `${headerColors.background} flex-row  relative h-20 relative border-b  border-${baseColors}`
        ),
      ]}>
      <StatusBar StatusBarStyle={`light-content`} />
      <View style={tw("flex-row w-full px-5 justify-between items-center mt-5 ")}>
        <Text style={tw(`${headerColors.font} text-2xl text-center mb-2 font-bold`)}>
          {title}
        </Text>
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
              style={tw(
                ` h-5 w-5 ${
                  theme === "light" ? "ml-1 bg-gray-100" : "ml-6 bg-green-300"
                } rounded-full`
              )}
            />
            <Ionicons
              name={theme === "dark" ? "sunny" : "moon"}
              color={getColor("yellow-300")}
              style={tw(`ml-2 absolute ${theme === "dark" ? "-left-1" : "right-1"} `)}
              size={16}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
