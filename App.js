import "react-native-gesture-handler"
import React from "react"
import { LogBox } from "react-native"
LogBox.ignoreAllLogs()
import { NavigationContainer } from "@react-navigation/native"
import { ThemeContextProvider } from "./Contexts/ThemeContext"
import StackNavigator from "./StackNavigator"
import { AuthProvider } from "./Contexts/AuthContext"
import "react-native-gesture-handler"
import { DataContextProvider } from "./Contexts/DataContext"


export default function App() {
  return (
    <AuthProvider>
      <ThemeContextProvider>
        <DataContextProvider>
          <StackNavigator />
        </DataContextProvider>
      </ThemeContextProvider>
    </AuthProvider>
  )
}
