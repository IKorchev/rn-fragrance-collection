import { onSnapshot, collection } from "@firebase/firestore"
import React, { useEffect, useState } from "react"
import Search from "../components/Search"
import { View, Text, FlatList,} from "react-native"
import PerfumeCard from "../components/PerfumeCard"
import useAuth from "../lib/useAuth"
import tw from "tailwind-rn"

const CollectionScreen = () => {
  const { user, db } = useAuth()
  const [userCollection, setUserCollection] = useState([])

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
    <View style={[tw("flex-1  bg-gray-800")]}>
      <View style={tw("px-5 flex-1")}>
        <Search />
        <Text style={tw("text-white text-lg my-4 text-center")}>
          Fragrances in your collection
        </Text>
        {userCollection && userCollection.length > 0 ? (
          <FlatList
            style={tw(" flex-1 ")}
            data={userCollection}
            renderItem={({ item, index }) => <PerfumeCard object={item} />}
          />
        ) : (
          <Text style={tw("text-xl text-center")}>
            You have nothing in your collection
          </Text>
        )}
      </View>
    </View>
  )
}

export default CollectionScreen
