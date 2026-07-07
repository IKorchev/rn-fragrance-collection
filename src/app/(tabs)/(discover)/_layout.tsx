import React from "react"
import { Stack } from "expo-router"
import { getHeaderTitle } from "expo-router/react-navigation"
import Header from "@/components/header"

export default function DiscoverLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ route, options, navigation }) => (
          <Header title={getHeaderTitle(options, route.name)} navigation={navigation} />
        ),
      }}>
      <Stack.Screen name="(top-tabs)" options={{ title: "Discover" }} />
    </Stack>
  )
}
