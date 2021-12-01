import "react-native-gesture-handler"
import React, { useEffect, useState } from "react"
import useAuth from "./Contexts/AuthContext"
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

import tw from "tailwind-rn"
// Screens
import SigninScreen from "./screens/SigninScreen"
import HomeScreen from "./screens/HomeScreen"
import CollectionScreen from "./screens/CollectionScreen"
import screenOptions from "./lib/utils/screenOptions"
import { TouchableWithoutFeedback, Keyboard } from "react-native"
import PerfumesTabs from "./screens/secondary/PerfumesTabs"
const Stack = createBottomTabNavigator()

const StackNavigator = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(false)
  }, [user])

  return loading ? null : user ? (
    <NavigationContainer>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss()
        }}>
        <Stack.Navigator>
          <Stack.Group screenOptions={({ route }) => screenOptions(route)}>
            <Stack.Screen name='Home' component={HomeScreen} />
            <Stack.Screen name='Add' component={PerfumesTabs} />
            <Stack.Screen name='Collection' component={CollectionScreen} />
          </Stack.Group>
        </Stack.Navigator>
      </TouchableWithoutFeedback>
    </NavigationContainer>
  ) : (
    <SigninScreen />
  )
}

export default StackNavigator
