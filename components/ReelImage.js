import React from "react"
import { View, Text, Image } from "react-native"
import tw from "tailwind-rn"
import useTheme from "../Contexts/ThemeContext"
const ReelImage = ({ name, url }) => {
  const { baseColors } = useTheme()
  return (
    <View style={tw("flex-1 items-center")}>
      <Text
        numberOfLines={1}
        style={tw(`text-${baseColors} px-2 text-lg text-center font-bold py-2 w-full`)}>
        {name}
      </Text>
      <Image
        resizeMode='contain'
        style={tw("h-60 w-60 flex mx-1")}
        source={{
          uri: url,
        }}
      />
    </View>
  )
}

export default ReelImage
