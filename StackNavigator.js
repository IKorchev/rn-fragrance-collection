import React from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import HomeScreen from "./screens/HomeScreen"
import ProfileScreen from "./screens/ProfileScreen"
import useAuth from "./lib/useAuth"
import SigninScreen from "./screens/SigninScreen"
import AddPerfumeModal from "./components/AddPerfumeModal"
const Stack = createNativeStackNavigator()

const StackNavigator = () => {
  const { user } = useAuth()
  return user ? (
    <Stack.Navigator>
      <Stack.Group>
        <Stack.Screen
          name='Home'
          options={{
            headerShown: false,
          }}
          component={HomeScreen}
        />
        <Stack.Screen name='Profile' component={ProfileScreen} />
      </Stack.Group>
    </Stack.Navigator>
  ) : (
    <SigninScreen />
  )
}

export default StackNavigator
