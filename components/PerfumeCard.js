import React from "react"
import { Text, TouchableOpacity, Image, View, StyleSheet } from "react-native"
import tw, { getColor } from "tailwind-rn"
import { AntDesign, FontAwesome5 } from "@expo/vector-icons"
import useAuth from "../Contexts/AuthContext"
import useTheme from "../Contexts/ThemeContext"
const PerfumeCard = ({ object }) => {
  const { incrementWear, deleteFragrance } = useAuth()
  const { cardColors } = useTheme()
  return (
    <View
      style={[
        tw(
          `${cardColors.background} flex-row items-center rounded-xl mx-5 my-1 overflow-hidden`
        ),
        style.cardShadow,
      ]}>
      <Image
        source={{
          uri: object.image_url,
        }}
        resizeMode='cover'
        style={tw("h-20 w-20")}
      />
      <View style={tw("px-3 py-1 h-full w-full")}>
        <Text
          numberOfLines={1}
          style={tw(`${cardColors.font} text-lg flex-wrap font-bold`)}>
          {object.name}
        </Text>
        <Text style={tw(`${cardColors.font} mt-4 flex-wrap font-bold opacity-70`)}>
          {object.times_worn === 0
            ? "Never worn"
            : object.times_worn === 1
            ? `Worn ${object.times_worn} time`
            : `Worn ${object.times_worn} times`}
        </Text>
      </View>
      <TouchableOpacity
        style={tw("absolute bottom-2 right-2 p-2 rounded-full bg-red-300 ")}
        onPress={() => deleteFragrance(object)}>
        <AntDesign name='delete' size={20} color={getColor("red-900")} style={tw("")} />
      </TouchableOpacity>
      <TouchableOpacity
        style={tw("absolute bottom-2 right-14 p-2 rounded-full bg-green-300")}
        onPress={() => incrementWear(object)}>
        <FontAwesome5 name='spray-can' size={20} color={getColor("green-900")} />
      </TouchableOpacity>
    </View>
  )
}
const style = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.32,
    shadowRadius: 5.46,
    elevation: 9,
  },
})

export default PerfumeCard
