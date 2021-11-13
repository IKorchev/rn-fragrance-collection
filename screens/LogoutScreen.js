import * as React from "react"
import { View } from "react-native"
import { auth } from "../lib/firebase"
import useAuth from "../lib/useAuth"

export default function LogoutScreen({ navigation }) {
  const { logOut } = useAuth()
  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      logOut(auth)
    })

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return unsubscribe
  }, [navigation])

  return <View />
}
