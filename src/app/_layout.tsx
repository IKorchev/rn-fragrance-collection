import "react-native-gesture-handler"
import "../global.css"
import React from "react"
import { LogBox, TouchableWithoutFeedback, Keyboard } from "react-native"
LogBox.ignoreAllLogs()
import { Stack } from "expo-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/contexts/auth-context"
import useAuth from "@/contexts/auth-context"
import { ThemeContextProvider } from "@/contexts/theme-context"
import { ToastContextProvider } from "@/contexts/toast-context"

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContextProvider>
        <AuthProvider>
          <ThemeContextProvider>
            <RootNavigator />
          </ThemeContextProvider>
        </AuthProvider>
      </ToastContextProvider>
    </QueryClientProvider>
  )
}

function RootNavigator() {
  const { user, authLoading } = useAuth()
  if (authLoading) return null

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <Stack>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </TouchableWithoutFeedback>
  )
}
