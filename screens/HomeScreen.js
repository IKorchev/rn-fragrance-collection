import { useNavigation } from "@react-navigation/core"
import React, { useEffect, useRef, useState } from "react"
import { View, FlatList, Button } from "react-native"
import tw from "tailwind-rn"
import ReelImage from "../components/ReelImage"
import useAuth from "../lib/useAuth"
import { collection, onSnapshot } from "@firebase/firestore"
import List from "../components/List"
const Home = () => {
  const { db, user } = useAuth()

  const [images, setImages] = useState([])
  const colRef = collection(db, "users", user.uid, "perfumes")

  useEffect(
    () =>
      // const colRef =
      user &&
      onSnapshot(colRef, (snapshot) => {
        const arr = snapshot.docs.map((el) => {
          const { image_url, name } = el.data()
          return { image_url, name }
        })
        setImages(arr)
      }),
    [user]
  )

  return (
    <View style={tw("py-44 bg-blue-100 flex items-center")}>
      {images.length > 0 && <List images={images} />}

      {/* <TouchableOpacity
        style={tw("bg-red-100 h-2 w-full absolute top-1/2 left-0")}></TouchableOpacity> */}
    </View>
  )
}

export default Home
