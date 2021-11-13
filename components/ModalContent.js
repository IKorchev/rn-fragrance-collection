import React, { useState } from "react"
import { View, Text, Image, TextInput, TouchableHighlight } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import tw from "tailwind-rn"
const ModalContent = ({ imageUrl, toggleModal }) => {
  const [text, onChangeText] = useState("")
  return (
    <View style={tw("w-full bg-white rounded-lg p-4 relative")}>
      <AntDesign
        style={tw("absolute top-3 right-3")}
        name='close'
        size={30}
        color='black'
        onPress={toggleModal}
      />
      <Text style={tw("flex-grow font-bold text-2xl ")}>Add Fragrance</Text>
      <View style={tw("mt-5 flex justify-center items-center")}>
        <Image
          resizeMode='contain'
          style={tw("h-36 w-36 mt-3 mx-1")}
          source={{
            uri: "https://cdn.notinoimg.com/detail_thumb/creed/3508441001114_01n-o/creed-aventus-eau-de-parfum-for-men___5.jpg",
          }}
        />
        <TextInput
          placeholder='Name'
          style={tw("border p-2 w-5/6 rounded-lg text-lg")}
          value={text}
          onChangeText={onChangeText}
        />
        <View>
          <TouchableHighlight style={tw("bg-green-300 p-3 rounded-lg mt-2")}>
            <Text>Add to collection</Text>
          </TouchableHighlight>
        </View>
      </View>
    </View>
  )
}

export default ModalContent
