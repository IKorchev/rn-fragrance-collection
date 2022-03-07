import React, { useEffect, useRef } from "react"
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import ReelImage from "./ReelImage"
import useAuth from "../Contexts/AuthContext"
import useTheme from "../Contexts/ThemeContext"
import useData from "../Contexts/DataContext"

const Picker = ({ fragrance, index }) => {
  const { incrementWear, userCollection } = useAuth()
  const { getNewFrag } = useData()
  const { viewColors } = useTheme()
  const flatListRef = useRef()
  const i = userCollection.find((el) => el.id === fragrance?.id)

  useEffect(() => {
    fragrance && flatListRef?.current.scrollToItem({ item: i, viewPosition: 0.5, animated: false })
  }, [fragrance?.id, i])

  return (
    <View style={tw("h-full w-full items-center py-12")}>
      <Text style={tw(`${viewColors.font} text-4xl font-bold `)}>Your pick</Text>
      <View style={[styles.dice, tw("h-72 w-60 py-1 rounded-xl")]}>
        <FlatList
          ref={flatListRef}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          scrollEnabled={false}
          onScrollToIndexFailed={() => {}}
          data={userCollection}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <ReelImage object={item} name={item.item.name} url={item.item.image_url} />
          )}
        />
      </View>
      <View style={tw("mt-12 flex-row")}>
        <View style={tw("items-center")}>
          <Text style={tw(`${viewColors.font} items-center mb-2 text-lg`)}>Wear</Text>
          <TouchableOpacity
            onPress={() => incrementWear(fragrance)}
            style={tw("p-3 h-16 w-16 mx-12 items-center justify-center bg-green-200 rounded-full")}>
            <FontAwesome5 name='spray-can' size={30} color={getColor("green-900")} />
          </TouchableOpacity>
        </View>
        <View style={tw("items-center")}>
          <Text style={tw(`${viewColors.font} items-center mb-2 text-lg`)}>Reroll</Text>
          <TouchableOpacity
            onPress={getNewFrag}
            style={tw("p-3 h-16 w-16 mx-12 items-center justify-center bg-red-200 rounded-full")}>
            <MaterialCommunityIcons name='dice-multiple' size={40} color={getColor("red-900")} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dice: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.39,
    shadowRadius: 22.3,
  },
})

export default Picker
