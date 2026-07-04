import React, { useState } from "react"
import { ListItem } from "@rneui/themed"
import { Image, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { AntDesign, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "../lib/utils/colors"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"
import DeleteBottomSheet from "./DeleteBottomSheet"

const getImageSource = (value) => {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  return /^(https?:)?\/\//i.test(trimmed) ? { uri: trimmed } : null
}

const CustomListItem = ({ name, place, imageUrl, timesWorn, inCollection, id }) => {
  const obj = inCollection
    ? {
        name: name,
        image_url: imageUrl,
        id: id,
      }
    : {
        name: name,
        image_url: imageUrl,
      }
  const { addFragranceToCollection, incrementWear, deleteFragrance } = useAuth()
  const { modalColors, baseColors, baseTextClass } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const imageSource = getImageSource(imageUrl)

  return (
    <ListItem
      containerStyle={[
        styles,
        {
          shadowColor: baseColors,
          backgroundColor: getColor(modalColors.background.replace("bg-", "")),
          marginVertical: 2,
          padding: 0,
          height: 80,
          marginHorizontal: 8,
          borderRadius: 2,
          overflow: "hidden",
        },
      ]}>
      {isVisible && (
        <DeleteBottomSheet
          isVisible={isVisible}
          close={() => setIsVisible(false)}
          deleteItem={() => deleteFragrance(obj)}
          item={obj}
        />
      )}
      {place && (
        <View className={`${baseTextClass} text-lg w-10 h-full justify-center items-center`}>
          <Text className={`${baseTextClass} text-lg font-bold text-center`}>{place}</Text>
        </View>
      )}
      {imageSource ? (
        <Image height='20' width='20' className='h-20 w-20' source={imageSource} />
      ) : (
        <View className='h-20 w-20 items-center justify-center rounded-md border border-gray-300'>
          <MaterialCommunityIcons name='image-off' size={24} color={getColor("gray-400")} />
        </View>
      )}
      <ListItem.Content style={{ padding: 0 }}>
        <ListItem.Title style={{ color: getColor(baseColors) }} numberOfLines={1}>
          {name.split(" - ")[1]}
        </ListItem.Title>
        <ListItem.Subtitle style={{ color: getColor(baseColors) }}>
          {name.split(" - ")[0]}
        </ListItem.Subtitle>
        {inCollection && (
          <ListItem.Subtitle style={{ color: getColor(baseColors) }}>
            Times worn: {timesWorn}
          </ListItem.Subtitle>
        )}
      </ListItem.Content>
      {!inCollection ? (
        <TouchableOpacity className='mr-3' onPress={() => addFragranceToCollection(obj)}>
          <AntDesign name='plus-square' color={getColor("green-400")} size={30} />
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            className='bg-green-400 h-10 w-10 justify-center mx-1 rounded-full items-center'
            onPress={() => incrementWear(obj)}>
            <FontAwesome5 name='spray-can' color={getColor("green-900")} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            className='bg-red-400 h-10 w-10 justify-center mx-1 rounded-full items-center'
            onPress={() => setIsVisible(true)}>
            <AntDesign name='delete' color={getColor("red-900")} size={18} />
          </TouchableOpacity>
        </>
      )}
    </ListItem>
  )
}

const styles = StyleSheet.create({
  shadowOpacity: 1,
  shadowRadius: 25,
  shadowOffset: {
    height: 5,
    width: 5,
  },
  elevation: 25,
})

export default CustomListItem
