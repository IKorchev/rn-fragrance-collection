import React from "react"
import { View, Text, Image } from "react-native"
import tw from "tailwind-rn"
const ReelImage = ({ object }) => {
  console.log(object.item.image_url)
  return (
    <View style={tw("flex items-center")}>
      <Image
        style={tw("h-60 w-60 mt-1 flex mx-1")}
        source={{
          uri: object.item.image_url,
        }}
      />
    </View>
  )
}

export default ReelImage
