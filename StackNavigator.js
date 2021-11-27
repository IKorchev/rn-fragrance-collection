import React from "react"
import useAuth from "./Contexts/AuthContext"
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import tw from "tailwind-rn"
// Screens
import SigninScreen from "./screens/SigninScreen"
import HomeScreen from "./screens/HomeScreen"
import CollectionScreen from "./screens/CollectionScreen"
import LogoutScreen from "./screens/LogoutScreen"
import screenOptions from "./lib/utils/screenOptions"
import { TouchableWithoutFeedback, Keyboard, TouchableOpacity, Text } from "react-native"
import PerfumesTabs from "./screens/secondary/PerfumesTabs"
const Stack = createBottomTabNavigator()
const Stack2 = createNativeStackNavigator()

const SearchStack = () => {
  return <NavigationContainer></NavigationContainer>
}

const StackNavigator = () => {
  const { user } = useAuth()

  return user ? (
    <NavigationContainer>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss()
        }}>
        <Stack.Navigator>
          <Stack.Group screenOptions={({ route }) => screenOptions(route)}>
            <Stack.Screen name='Home' component={HomeScreen} />
            <Stack.Screen name='Collection' component={CollectionScreen} />
            <Stack.Screen name='Add' component={PerfumesTabs} />
            <Stack.Screen name='Log out' component={LogoutScreen} />
          </Stack.Group>
        </Stack.Navigator>
      </TouchableWithoutFeedback>
    </NavigationContainer>
  ) : (
    <SigninScreen />
  )
}

export default StackNavigator
