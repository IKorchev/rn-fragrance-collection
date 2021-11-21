import "react-native-gesture-handler"
import React from "react"
import { LogBox } from "react-native"
LogBox.ignoreAllLogs()
import { NavigationContainer } from "@react-navigation/native"
import { ThemeContextProvider } from "./Contexts/ThemeContext"
import StackNavigator from "./StackNavigator"
import { AuthProvider } from "./Contexts/AuthContext"

export default function App() {
  return (
    <AuthProvider>
      <ThemeContextProvider>
        <NavigationContainer>
          <StackNavigator />
        </NavigationContainer>
      </ThemeContextProvider>
    </AuthProvider>
  )
}
