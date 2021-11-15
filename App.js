import "react-native-gesture-handler"
import React from "react"
import { LogBox } from "react-native"
LogBox.ignoreAllLogs()
import { NavigationContainer } from "@react-navigation/native"
import StackNavigator from "./StackNavigator"
import { AuthProvider } from "./lib/useAuth"

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StackNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}
