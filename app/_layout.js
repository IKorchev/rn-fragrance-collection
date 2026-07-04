import "react-native-gesture-handler"
import "../global.css"
import React from "react"
import { LogBox, TouchableWithoutFeedback, Keyboard } from "react-native"
LogBox.ignoreAllLogs()
import { Stack } from "expo-router"
import { AuthProvider } from "../Contexts/AuthContext"
import useAuth from "../Contexts/AuthContext"
import { ThemeContextProvider } from "../Contexts/ThemeContext"
import { DataContextProvider } from "../Contexts/DataContext"

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeContextProvider>
        <DataContextProvider>
          <RootNavigator />
        </DataContextProvider>
      </ThemeContextProvider>
    </AuthProvider>
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
