import React from "react"
import { Text, TouchableOpacity, Image, View, StyleSheet, Alert } from "react-native"
import tw, { getColor } from "tailwind-rn"
import { AntDesign } from "@expo/vector-icons"
import { FontAwesome5 } from "@expo/vector-icons"
import {
  collection,
  deleteDoc,
  doc,
  increment,
  updateDoc,
} from "@firebase/firestore"
import useAuth from "../lib/useAuth"
const PerfumeCard = ({ object }) => {
  const { user, db } = useAuth()
  const removeDocument = async () => {
    try {
      const ref = collection(db, "users", user.uid, "perfumes")
      const docRef = doc(ref, object.id)
      await deleteDoc(docRef)
      Alert.alert("OK", "Item removed")
    } catch (err) {
      console.log(err)
    }
  }
  const updateDocument = async () => {
    try {
      const ref = collection(db, "users", user.uid, "perfumes")
      const docRef = doc(ref, object.id)
      await updateDoc(docRef, {
        ...object,
        times_worn: increment(1),
      })
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <View
      style={[
        style.cardShadow,
        tw("flex-row items-center bg-white rounded-md mx-5 my-1"),
      ]}>
      <Image
        source={{
          uri: object.image_url,
        }}
        style={tw("h-24 w-24 mt-3 mx-1")}
      />
      <View style={tw("justify-between px-3 py-2 overflow-hidden w-full")}>
        <Text
          ellipsizeMode='tail'
          numberOfLines={1}
          style={tw("text-xl flex-wrap font-bold")}>
          {object.name}
        </Text>
        {object.times_worn >= 1 && (
          <Text>
            Worn <Text style={tw("font-bold")}>{object.times_worn}</Text>
            {object.times_worn > 1 ? " times" : " time"}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={tw("absolute bottom-2 right-2 p-2 rounded-full bg-red-300 ")}
        onPress={removeDocument}>
        <AntDesign name='delete' size={20} color={getColor("red-900")} style={tw("")} />
      </TouchableOpacity>
      <TouchableOpacity
        style={tw("absolute bottom-2 right-14 p-2 rounded-full bg-green-300")}
        onPress={updateDocument}>
        <FontAwesome5 name='spray-can' size={20} color={getColor("green-900")} />
      </TouchableOpacity>
    </View>
  )
}
const style = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
})

export default PerfumeCard
