import React from "react"
import { View, Text, Image } from "react-native"
import tw from "tailwind-rn"
const ReelImage = ({ object }) => {
  return (
    <View style={tw("flex items-center ")}>
      <Text
        numberOfLines={1}
        style={tw("px-2 text-lg text-center font-bold py-2 text-red-600 w-60")}>
        {object.item.name}
      </Text>
      <Image
        resizeMode='contain'
        style={tw("h-60 w-60 flex mx-1")}
        source={{
          uri: object.item.image_url,
        }}
      />
    </View>
  )
}

export default ReelImage
