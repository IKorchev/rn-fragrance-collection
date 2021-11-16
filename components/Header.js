import React from "react"
import { View, Text } from "react-native"
import tw from "tailwind-rn"
export default function Header({ title, style, navigation }) {
  return (
    <View style={[style, tw("px-5 justify-center relative")]}>
      <Text style={tw("text-green-300 text-2xl text-center -mb-5 font-bold")}>
        {title}
      </Text>
    </View>
  )
}
