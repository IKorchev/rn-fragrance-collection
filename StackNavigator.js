import React from "react"
import useAuth from "./lib/useAuth"
// ICONS AND NAVIGATOR
import { AntDesign } from "@expo/vector-icons"
import { Ionicons } from "@expo/vector-icons"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
// SCREENS
import SigninScreen from "./screens/SigninScreen"
import HomeScreen from "./screens/HomeScreen"
import CollectionScreen from "./screens/CollectionScreen"
import SearchScreen from "./screens/SearchScreen"
import LogoutScreen from "./screens/LogoutScreen"

const Stack = createBottomTabNavigator()

const StackNavigator = () => {
  const { user } = useAuth()
  return user ? (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          const iconName =
            route.name === "Home"
              ? "home"
              : route.name === "Profile"
              ? "logout"
              : route.name === "Collection"
              ? "book"
              : route.name === "Search" && "search1"

          return route.name !== "Log out" ? (
            <AntDesign name={iconName} size={28} color={color} />
          ) : (
            <Ionicons name='log-out-outline' size={28} color='black' />
          )
        },
        tabBarActiveTintColor: "red",
        tabBarInactiveTintColor: "black",
      })}>
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Search' component={SearchScreen} />
      <Stack.Screen
        name='Collection'
        options={{
          // TODO: Should be the amount of perfumes in the users collection
          tabBarBadge: 24,
        }}
        component={CollectionScreen}
      />
      <Stack.Screen name='Log out' component={LogoutScreen} />
    </Stack.Navigator>
  ) : (
    <SigninScreen />
  )
}

export default StackNavigator
