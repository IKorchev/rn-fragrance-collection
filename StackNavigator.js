import React from "react"
import useAuth from "./lib/useAuth"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
// Screens
import SigninScreen from "./screens/SigninScreen"
import HomeScreen from "./screens/HomeScreen"
import CollectionScreen from "./screens/CollectionScreen"
import LogoutScreen from "./screens/LogoutScreen"
import screenOptions from "./lib/utils/screenOptions"
import { TouchableWithoutFeedback, Keyboard } from "react-native"

const Stack = createBottomTabNavigator()

const StackNavigator = () => {
  const { user } = useAuth()

  return user ? (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss()
      }}>
      <Stack.Navigator screenOptions={({ route }) => screenOptions(route)}>
        <Stack.Screen name='Home' component={HomeScreen} />
        <Stack.Screen name='Collection' component={CollectionScreen} />
        <Stack.Screen name='Pick Random' component={CollectionScreen} />
        <Stack.Screen name='Log out' component={LogoutScreen} />
      </Stack.Navigator>
    </TouchableWithoutFeedback>
  ) : (
    <SigninScreen />
  )
}

export default StackNavigator
