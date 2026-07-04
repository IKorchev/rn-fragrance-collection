import React from "react"
import { Stack } from "expo-router"
import { getHeaderTitle } from "expo-router/react-navigation"
import Header from "../../../components/Header"

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ route, options, navigation }) => (
          <Header title={getHeaderTitle(options, route.name)} navigation={navigation} />
        ),
      }}>
      <Stack.Screen name="index" options={{ title: "Home" }} />
    </Stack>
  )
}
