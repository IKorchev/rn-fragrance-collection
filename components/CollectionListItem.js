import React, { useState } from "react"
import { ListItem } from "react-native-elements"
import { Image, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { FontAwesome5 } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"
import DeleteBottomSheet from "./DeleteBottomSheet"

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
  const { modalColors, baseColors } = useTheme()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <ListItem
      containerStyle={[
        styles,
        { shadowColor: baseColors },
        tw(`${modalColors.background} my-0.5 p-0 h-20 mx-2 rounded-sm overflow-hidden`),
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
        <View style={tw(`text-${baseColors} text-lg w-10 h-full justify-center items-center`)}>
          <Text style={tw(`text-${baseColors} text-lg font-bold text-center`)}>{place}</Text>
        </View>
      )}
      <Image height='20' width='20' style={tw("h-20 w-20")} source={{ uri: imageUrl }} />
      <ListItem.Content style={tw("p-0")}>
        <ListItem.Title style={tw(`text-${baseColors}`)} numberOfLines={1}>
          {name.split(" - ")[1]}
        </ListItem.Title>
        <ListItem.Subtitle style={tw(`text-${baseColors}`)}>
          {name.split(" - ")[0]}
        </ListItem.Subtitle>
        {inCollection && (
          <ListItem.Subtitle style={tw(`text-${baseColors}`)}>
            Times worn: {timesWorn}
          </ListItem.Subtitle>
        )}
      </ListItem.Content>
      {!inCollection ? (
        <TouchableOpacity style={tw("mr-3")} onPress={() => addFragranceToCollection(obj)}>
          <AntDesign name='plussquare' color={getColor("green-400")} size={30} />
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={tw("bg-green-400 h-10 w-10 justify-center mx-1 rounded-full items-center")}
            onPress={() => incrementWear(obj)}>
            <FontAwesome5 name='spray-can' color={getColor("green-900")} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={tw("bg-red-400 h-10 w-10 justify-center mx-1 rounded-full items-center")}
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
