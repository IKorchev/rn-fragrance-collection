import React, { useState } from "react"
import { View, Text, Image, TextInput, TouchableOpacity, Alert } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { doc, updateDoc, addDoc, collection } from "firebase/firestore"
import { db } from "../lib/firebase"
import tw from "tailwind-rn"
import useAuth from "../lib/useAuth"
const ModalContent = ({ imageUrl, toggleModal }) => {
  const { user } = useAuth()
  const [text, onChangeText] = useState("")

  const addFragranceToCollection = async () => {
    if (text.length < 3) {
      Alert.alert("Ooops", "The name must be 3 or more characters!")
      return
    }
    if (text.length > 20) {
      Alert.alert("Ooops", "The name must be less than 20 characters!")
      return
    }
    try {
      const data = {
        image_url: imageUrl,
        name: text,
        times_worn: 0,
      }
      const colRef = collection(db, "users", user.uid, "perfumes")
      const response = await addDoc(colRef, data)
      const docRef = doc(colRef, response.id)
      await updateDoc(docRef, {
        ...data,
        id: response.id,
      })
      Alert.alert("Item added", `${data.name} has been added to your collection! `)
    } catch (error) {
      Alert.alert("Item was not added", "Something went wrong, please try again later.")
      console.log(error)
    }
  }

  return (
    <View style={tw("bg-white rounded-lg p-4 relative")}>
      <AntDesign
        style={tw("absolute top-3 right-3")}
        name='close'
        size={30}
        color='black'
        onPress={toggleModal}
      />
      <Text style={tw("flex-grow font-bold text-3xl text-center mt-5 ")}>
        Add Fragrance
      </Text>
      <View style={tw("mt-5 flex justify-center items-center")}>
        <Image
          resizeMode='contain'
          style={tw("h-36 w-36 mt-3 mx-1")}
          source={{
            uri:
              imageUrl ||
              "https://cdn.notinoimg.com/detail_thumb/creed/3508441001114_01n-o/creed-aventus-eau-de-parfum-for-men___5.jpg",
          }}
        />
        <TextInput
          placeholder='Name'
          style={tw("border p-2 mt-5 w-5/6 rounded-lg text-lg")}
          value={text}
          onChangeText={onChangeText}
        />
        <TouchableOpacity onPress={addFragranceToCollection}>
          <View style={tw("bg-green-300  p-3 rounded-lg mt-5")}>
            <Text style={tw("text-center")}>Add to collection</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default ModalContent
