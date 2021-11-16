import * as React from "react"
import { View, Alert } from "react-native"
import { auth } from "../lib/firebase"
import useAuth from "../lib/useAuth"

export default function LogoutScreen({ navigation }) {
  const { logOut } = useAuth()
  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      return Alert.alert("Log out", "Are you sure?", [
        {
          text: "LOG OUT",
          onPress: () => logOut(auth),
        },
        {
          text: "GO BACK",
          onPress: () => {
            navigation.goBack()
            console.log("Keep me in")
          },
        },
      ])
    })

    return unsubscribe
  }, [navigation])

  return <View />
}
