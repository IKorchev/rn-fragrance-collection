import React from "react"
import { ListItem } from "react-native-elements"
import { Image, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"

const TopListItem = ({ name, place, imageUrl, rating, totalVotes }) => {
  const { addFragranceToCollection } = useAuth()
  const { modalColors, baseColors } = useTheme()
  const title = name.split(" - ")[1]
  const brand = name.split(" - ")[0]
  const handleAddFragrance = () => addFragranceToCollection({ name: name, image_url: imageUrl })

  return (
    <ListItem
      containerStyle={[
        styles,
        { shadowColor: baseColors },
        tw(`${modalColors.background} my-0.5 p-0 h-20 mx-2 rounded-sm overflow-hidden`),
      ]}>
      <View style={tw(`text-${baseColors} text-lg w-10 h-full justify-center items-center`)}>
        <Text style={tw(`text-${baseColors} text-lg font-bold text-center`)}>{place}</Text>
      </View>
      <Image height='20' width='20' style={tw("h-20 w-20")} source={{ uri: imageUrl }} />
      <ListItem.Content style={tw("p-0")}>
        <ListItem.Title style={tw(`text-${baseColors} font-bold`)} numberOfLines={1}>
          {title}
        </ListItem.Title>
        <ListItem.Subtitle style={tw(`text-${baseColors} py-1`)}>{brand}</ListItem.Subtitle>
        <Text style={tw(`text-${baseColors} py-1`)}>
          Rating: <Text style={tw("font-bold")}>{rating || "N/A"}</Text> -
          <Text style={tw("font-bold")}> {totalVotes || "N/A"}</Text> Total Votes
        </Text>
      </ListItem.Content>
      <TouchableOpacity style={tw("mr-3")} onPress={handleAddFragrance}>
        <AntDesign name='plussquare' color={getColor("green-400")} size={30} />
      </TouchableOpacity>
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

export default TopListItem
