import { onSnapshot, collection } from "@firebase/firestore"
import React, { useEffect, useState } from "react"
import { AntDesign } from "@expo/vector-icons"
import Search from "../components/SearchModal"
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native"
import PerfumeCard from "../components/PerfumeCard"
import useAuth from "../lib/useAuth"
import tw, { getColor } from "tailwind-rn"

const CollectionScreen = () => {
  const { user, db } = useAuth()
  const [userCollection, setUserCollection] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  useEffect(
    () =>
      user &&
      onSnapshot(collection(db, "users", user.uid, "perfumes"), (doc) => {
        const perfumeObject = doc.docs.map((el) => el.data())
        setUserCollection(perfumeObject)
      }),
    [user]
  )
  return (
    <View style={[tw("flex-1 items-center bg-gray-800")]}>
      <View style={tw("px-5 flex-1")}>
        <Search isOpen={isOpen} toggleModal={setIsOpen} />
        <Text style={tw("text-white text-lg my-4 text-center")}>
          Fragrances in your collection
        </Text>
        {userCollection && userCollection.length > 0 ? (
          <FlatList
            style={tw("flex-1")}
            data={userCollection}
            renderItem={({ item, index }) => <PerfumeCard object={item} />}
          />
        ) : (
          <Text style={tw("text-xl text-center")}>
            You have nothing in your collection
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={setIsOpen}
        style={[
          style.addButton,
          tw("bg-gray-100 my-3 w-12 h-12 items-center justify-center rounded-full"),
        ]}>
        <AntDesign name='plus' size={30} color='black' />
      </TouchableOpacity>
    </View>
  )
}

const style = StyleSheet.create({
  addButton: {
    shadowColor: "rgb(255,255,255)",
    shadowOpacity: 1,
    shadowRadius: 1565,
    shadowOffset: {
      height: -1155,
      width: 0,
    },
    elevation: 15,
  },
})

export default CollectionScreen
