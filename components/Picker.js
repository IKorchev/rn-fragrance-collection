import React, { useEffect, useRef } from "react"
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import { getColor } from "../lib/utils/colors"
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
    <View className='h-full w-full items-center py-12'>
      <Text className={`${viewColors.font} text-4xl font-bold`}>Your pick</Text>
      <View className='h-72 w-60 py-1 rounded-xl' style={styles.dice}>
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
      <View className='mt-12 flex-row'>
        <View className='items-center'>
          <Text className={`${viewColors.font} items-center mb-2 text-lg`}>Wear</Text>
          <TouchableOpacity
            onPress={() => incrementWear(fragrance)}
            className='p-3 h-16 w-16 mx-12 items-center justify-center bg-green-200 rounded-full'>
            <FontAwesome5 name='spray-can' size={30} color={getColor("green-900")} />
          </TouchableOpacity>
        </View>
        <View className='items-center'>
          <Text className={`${viewColors.font} items-center mb-2 text-lg`}>Reroll</Text>
          <TouchableOpacity
            onPress={getNewFrag}
            className='p-3 h-16 w-16 mx-12 items-center justify-center bg-red-200 rounded-full'>
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
