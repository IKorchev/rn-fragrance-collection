import { onSnapshot, collection } from "@firebase/firestore"
import React, { useEffect, useState } from "react"
import { AntDesign } from "@expo/vector-icons"
import Search from "../components/SearchModal"
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native"
import PerfumeCard from "../components/PerfumeCard"
import useAuth from "../Contexts/AuthContext"
import tw, { getColor } from "tailwind-rn"
import useTheme from "../Contexts/ThemeContext"

const CollectionScreen = () => {
  const { user, db } = useAuth()
  const [userCollection, setUserCollection] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const { viewColors } = useTheme()
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
    <View style={[tw(`flex-1 items-center ${viewColors.background}`)]}>
      <View style={tw("px-5 flex-1")}>
        <Search isOpen={isOpen} toggleModal={setIsOpen} />
        <Text style={tw(`${viewColors.font} text-xl my-5 text-center`)}>
          Fragrances in your collection
        </Text>
        {userCollection && userCollection.length > 0 ? (
          <FlatList
            style={tw("flex-1")}
            data={userCollection}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => <PerfumeCard object={item} />}
          />
        ) : (
          <Text style={tw(`${viewColors.font} text-xl text-center`)}>
            You have nothing in your collection
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={setIsOpen}
        style={[
          style.addButton,
          tw(`bg-green-500 my-5 w-12 h-12 items-center justify-center rounded-full`),
        ]}>
        <AntDesign name='plus' size={30} color='white' />
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
