import React, { useLayoutEffect, useEffect, useRef, useState } from "react"
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from "react-native"
import ReelImage from "./ReelImage"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import * as A from "react-native-animatable"
import useAuth from "../Contexts/AuthContext"
import useTheme from "../Contexts/ThemeContext"
import { random } from "lodash"
import useData from "../Contexts/DataContext"
const Picker = ({ images }) => {
  const { incrementWear } = useAuth()
  const { theme, viewColors } = useTheme()
  const { getNewFrag, fragrance } = useData()
  const flatListRef = useRef()
  const diceContainerRef = useRef()
  const [dice, setDice] = useState("dice-6")

  const rollDice = async () => {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms))
    diceContainerRef.current.bounceIn()
    diceContainerRef.current.rotate(360)
    for (let i = 1; i < 8; i++) {
      await timer(11)
      setDice(`dice-${random(1, 6)}`)
    }
  }
  useEffect(() => {
    flatListRef.current?.scrollToIndex({
      animated: true,
      index: fragrance.index,

    })

  },[fragrance])
  return (
    <View style={tw("h-full w-full items-center py-5")}>
      <Text style={tw(`${viewColors.font} text-3xl mb-3 font-bold`)}>Your pick</Text>
      {images.length ? (
        <View style={[styles.dice, tw("h-72 w-60 py-2 rounded-xl")]}>
          <FlatList
            ref={flatListRef}
            horizontal={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            data={images}
            keyExtractor={(item, index) => item.id}
            renderItem={(item, index) => <ReelImage object={item} />}
          />
        </View>
      ) : (
        <></>
      )}
      <View style={tw("mt-12 flex-row")}>
        <View style={tw("items-center")}>
          <Text style={tw(`${viewColors.font} items-center mb-2 text-lg`)}>Wear</Text>
          <TouchableOpacity
            onPress={() => incrementWear(fragrance.fragrancePicked)}
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
      <A.View ref={diceContainerRef} style={tw("mt-12 items-center")}>
        <MaterialCommunityIcons
          name={dice}
          onPress={getNewFrag}
          style={styles.dice}
          color={theme === "dark" ? "white" : getColor("gray-900")}
          size={80}
        />
      </A.View>
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
