import React, { useEffect } from "react"
import { Text, TouchableOpacity, View, StatusBar } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"

interface HeaderProps {
  title: string
  navigation?: unknown
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { headerColors, cardBorderColors, theme, setTheme } = useTheme()
  const { user } = useAuth()
  const offset = useSharedValue(theme === "light" ? 0 : 1)

  useEffect(() => {
    offset.value = withTiming(theme === "light" ? 0 : 1, { duration: 200 })
  }, [theme])

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * 20 }],
  }))

  return (
    // Background/border via explicit style, not className — the navigator's
    // header slot repaints outside NativeWind's remount path, so classes on
    // this root element don't reliably re-apply on theme change.
    <SafeAreaView
      edges={["top"]}
      style={{
        backgroundColor: getColor(headerColors.background.replace("bg-", "")),
        borderBottomWidth: 1,
        borderBottomColor: getColor(cardBorderColors),
      }}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      <View className='flex-row w-full px-5 pb-3 pt-1 justify-between items-center'>
        <Avatar
          size={32}
          rounded
          source={user?.photoURL ? { uri: user.photoURL } : undefined}
          onPress={() => router.push("/profile")}
        />
        <Text className={`${headerColors.font} text-2xl text-center font-bold`}>{title}</Text>
        <View className='flex-row items-center'>
          <TouchableOpacity
            onPress={() => {
              setTheme(() => (theme === "dark" ? "light" : "dark"))
            }}
            className={`${
              theme === "dark" ? "bg-zinc-700" : "bg-zinc-300"
            } h-6 justify-center rounded-full w-12`}>
            <Animated.View
              style={dotStyle}
              className={`h-5 w-5 ml-1 rounded-full ${theme === "light" ? "bg-white" : "bg-emerald-300"}`}
            />
            <Ionicons
              name={theme === "dark" ? "sunny" : "moon"}
              color={theme === "dark" ? getColor("amber-300") : getColor("zinc-600")}
              className={`ml-2 absolute ${theme === "light" ? "right-1" : "-left-1"}`}
              size={16}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
