import React, { useRef } from "react"
import { View, Text, FlatList, TouchableOpacity } from "react-native"
import ReelImage from "./ReelImage"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import tw from "tailwind-rn"
const List = ({ images }) => {
  const flatListRef = useRef()

  return (
    <View style={tw("")}>
      <FlatList
        ref={flatListRef}
        style={tw("")}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        data={images}
        renderItem={(item, index) => <ReelImage object={item} />}></FlatList>

      <View style={tw("mt-3 items-center")}>
        <TouchableOpacity
          style={tw(
            "flex bg-blue-400 w-20 h-20 justify-center items-center py-2 rounded-lg"
          )}
          onPress={() => {
            const randomIndex = Math.floor(Math.random() * images.length)
            flatListRef.current.scrollToIndex({
              animated: true,
              index: randomIndex,
              viewPosition: 0.5,
            })
          }}>
          <MaterialCommunityIcons name='dice-6' color='blue' size={40} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default List
