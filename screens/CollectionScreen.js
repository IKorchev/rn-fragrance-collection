import { doc, onSnapshot, collection } from "@firebase/firestore"
import React, { useEffect, useState } from "react"
import { View, Text, FlatList, StyleSheet } from "react-native"
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
    <View style={[tw("bg-blue-100 h-full overflow-hidden")]}>
      <Text style={tw("text-3xl text-center my-4")}>Your collection</Text>
      <View>
        {userCollection && userCollection.length > 0 ? (
          <FlatList
            style={styles.container}
            data={userCollection}
            renderItem={({ item, index }) => <PerfumeCard object={item} />}
          />
        ) : (
          <Text style={tw("text-xl")}>You have nothing in your collection</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 100,
  },
})

export default CollectionScreen
