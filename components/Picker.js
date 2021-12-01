import React, { useEffect, useRef } from "react"
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from "react-native"
import ReelImage from "./ReelImage"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import tw from "tailwind-rn"
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
    fragrance &&
      flatListRef?.current.scrollToItem({ item: i, viewPosition: 0.5, animated: false })
  }, [fragrance?.id, i])
  return (
    <View style={tw("h-full w-full items-center py-5")}>
      <View style={[styles.dice, tw("h-72 w-60 py-2 rounded-xl")]}>
        <FlatList
          ref={flatListRef}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          ListEmptyComponent={
            <Text style={tw(`text-xl text-center ${viewColors.font}`)}>
              Nothing to see
            </Text>
          }
          scrollEnabled={false}
          onScrollToIndexFailed={() => {
            console.log("failed")
          }}
          data={userCollection}
          keyExtractor={(item, index) => item.id}
          renderItem={(item, index) => <ReelImage object={item} />}
        />
      </View>

      <View style={tw("mt-12 flex-row")}>
        <View style={tw("items-center")}>
          <Text style={tw(`${viewColors.font} items-center mb-2 text-lg`)}>Wear</Text>
          <TouchableOpacity
            onPress={() => incrementWear(fragrance)}
            style={tw("p-3 mx-12 items-center bg-green-300 rounded-full")}>
            <FontAwesome5 name='spray-can' size={40} color='black' />
          </TouchableOpacity>
        </View>
        <View style={tw("items-center")}>
          <Text style={tw(`${viewColors.font} items-center mb-2 text-lg`)}>Reroll</Text>
          <TouchableOpacity
            onPress={getNewFrag}
            style={tw("p-3 mx-12 items-center bg-red-400 rounded-full")}>
            <MaterialCommunityIcons name='dice-multiple' size={40} color='black' />
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
