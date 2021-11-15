import React, { useEffect, useState } from "react"
import useAuth from "./lib/useAuth"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
// Screens
import SigninScreen from "./screens/SigninScreen"
import HomeScreen from "./screens/HomeScreen"
import CollectionScreen from "./screens/CollectionScreen"
import SearchScreen from "./screens/SearchScreen"
import LogoutScreen from "./screens/LogoutScreen"
import screenOptions from "./lib/utils/screenOptions"

const Stack = createBottomTabNavigator()

const StackNavigator = () => {
  const { user } = useAuth()

  return user ? (
    <Stack.Navigator screenOptions={({ route }) => screenOptions(route)}>
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Add' component={SearchScreen} />
      <Stack.Screen name='Collection' component={CollectionScreen} />
      <Stack.Screen name='Pick Random' component={CollectionScreen} />
      <Stack.Screen name='Log out' component={LogoutScreen} />
    </Stack.Navigator>
  ) : (
    <SigninScreen />
  )
}

export default StackNavigator
