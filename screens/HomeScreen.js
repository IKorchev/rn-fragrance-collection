import { useNavigation } from "@react-navigation/core"
import React, { useEffect, useState } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import tw from "tailwind-rn"
import useAuth from "../Contexts/AuthContext"
import { collection, onSnapshot } from "@firebase/firestore"
import List from "../components/Picker"
import useTheme from "../Contexts/ThemeContext"
const Home = () => {
  const { db, user } = useAuth()
  const navigator = useNavigation()
  const [images, setImages] = useState([])
  const colRef = collection(db, "users", user.uid, "perfumes")
  const [loading, setLoading] = useState(true)
  const { viewColors } = useTheme()
  useEffect(
    () =>
      onSnapshot(colRef, (snapshot) => {
        const arr = snapshot.docs.map((el) => {
          return el.data()
        })
        setImages(arr)
        setLoading(false)
      }),
    []
  )

  return (
    <View
      style={tw(
        `${viewColors.background}  h-full flex justify-center flex items-center`
      )}>
      {loading ? (
        <View />
      ) : images.length > 0 ? (
        <List colors={viewColors} images={images} />
      ) : (
        <View style={tw("items-center")}>
          <Text style={tw(`${viewColors.font} text-2xl text-center`)}>
            You have no fragrances in your collection.
          </Text>
          <TouchableOpacity
            onPress={() => navigator.navigate("Add")}
            style={tw("p-3 border border-pink-900 rounded-md w-60 mt-12 bg-gray-900")}>
            <Text style={tw("text-white text-center text-lg")}>GET STARTED</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

export default Home
