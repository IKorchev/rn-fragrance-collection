import React, { useEffect } from "react"
import { Text, TouchableOpacity, View, SafeAreaView, StatusBar } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { getColor } from "../lib/utils/colors"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"

export default function Header({ title, navigation }) {
  const { headerColors, theme, setTheme, baseBorderClass } = useTheme()
  const { user, logOut } = useAuth()
  const offset = useSharedValue(theme === "light" ? 0 : 1)

  useEffect(() => {
    offset.value = withTiming(theme === "light" ? 0 : 1, { duration: 200 })
  }, [theme])

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * 20 }],
  }))

  return (
    <SafeAreaView
      className={`${headerColors.background} flex-row relative h-20 border-b ${baseBorderClass}`}>
      <StatusBar StatusBarStyle={`light-content`} />
      <View className='flex-row w-full px-5 justify-between items-center mt-5'>
        <Avatar size={32} rounded source={{ uri: user.photoURL }} onLongPress={logOut} />
        <Text className={`${headerColors.font} text-2xl text-center mb-2 font-bold`}>{title}</Text>
        <View className='flex-row items-center'>
          <TouchableOpacity
            onPress={() => {
              setTheme(() => (theme === "dark" ? "light" : "dark"))
            }}
            className={`${
              theme === "dark" ? "bg-gray-700" : "bg-gray-800"
            } h-6 justify-center rounded-full w-12`}>
            <Animated.View
              style={dotStyle}
              className={`h-5 w-5 ml-1 rounded-full ${theme === "light" ? "bg-gray-100" : "bg-green-300"}`}
            />
            <Ionicons
              name={theme === "dark" ? "sunny" : "moon"}
              color={getColor("yellow-300")}
              className={`ml-2 absolute ${theme === "light" ? "right-1" : "-left-1"}`}
              size={16}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
