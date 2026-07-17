import React, { useEffect, useRef } from "react"
import { Animated, Text, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import type { Toast } from "@/contexts/toast-context"

interface ToastBannerProps {
  toast: Toast | null
  onDismiss: () => void
}

const ToastBanner = ({ toast, onDismiss }: ToastBannerProps) => {
  const { theme } = useTheme()
  const translateY = useRef(new Animated.Value(100)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: toast ? 0 : 100,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [toast])

  if (!toast) return null

  return (
    <SafeAreaView
      pointerEvents='box-none'
      className='absolute inset-x-0 bottom-0 items-center px-4 pb-4'>
      <Animated.View
        style={{ transform: [{ translateY }] }}
        className={`${
          theme === "dark" ? "bg-zinc-100" : "bg-zinc-900"
        } w-full flex-row items-center rounded-2xl px-4 py-3 shadow-lg`}>
        <MaterialCommunityIcons
          name='check-circle'
          size={20}
          color={getColor(theme === "dark" ? "emerald-600" : "emerald-400")}
        />
        <Text
          className={`${theme === "dark" ? "text-black" : "text-white"} flex-1 text-base pl-2.5 pr-2`}>
          {toast.message}
        </Text>
        {toast.actionLabel && (
          <TouchableOpacity
            onPress={() => {
              toast.onAction?.()
              onDismiss()
            }}
            className='ml-3'>
            {/* Toast bg is inverted relative to the theme, so the accent inverts too */}
            <Text
              className={`${theme === "dark" ? "text-emerald-700" : "text-emerald-400"} text-base font-bold`}>
              {toast.actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  )
}

export default ToastBanner
