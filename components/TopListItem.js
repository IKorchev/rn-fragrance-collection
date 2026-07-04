import React from "react"
import { ListItem } from "@rneui/themed"
import { Image, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { getColor } from "../lib/utils/colors"
import useTheme from "../Contexts/ThemeContext"
import useAuth from "../Contexts/AuthContext"

const TopListItem = ({ name, place, imageUrl, rating, totalVotes }) => {
  const { addFragranceToCollection } = useAuth()
  const { modalColors, baseColors, baseTextClass } = useTheme()
  const title = name.split(" - ")[1]
  const brand = name.split(" - ")[0]
  const handleAddFragrance = () => addFragranceToCollection({ name: name, image_url: imageUrl })

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
      <View className={`${baseTextClass} text-lg w-10 h-full justify-center items-center`}>
        <Text className={`${baseTextClass} text-lg font-bold text-center`}>{place}</Text>
      </View>
      <Image height='20' width='20' className='h-20 w-20' source={{ uri: imageUrl }} />
      <ListItem.Content style={{ padding: 0 }}>
        <ListItem.Title
          style={{ color: getColor(baseColors), fontWeight: "bold" }}
          numberOfLines={1}>
          {title}
        </ListItem.Title>
        <ListItem.Subtitle style={{ color: getColor(baseColors), paddingVertical: 4 }}>
          {brand}
        </ListItem.Subtitle>
        <Text className={`${baseTextClass} py-1`}>
          Rating: <Text className='font-bold'>{rating || "N/A"}</Text> -
          <Text className='font-bold'> {totalVotes || "N/A"}</Text> Total Votes
        </Text>
      </ListItem.Content>
      <TouchableOpacity className='mr-3' onPress={handleAddFragrance}>
        <AntDesign name='plus-square' color={getColor("green-400")} size={30} />
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
