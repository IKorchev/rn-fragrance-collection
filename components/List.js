import React, { useLayoutEffect, useEffect, useRef, useState } from "react"
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from "react-native"
import ReelImage from "./ReelImage"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import tw, { getColor } from "tailwind-rn"
import * as A from "react-native-animatable"
import useAuth from "../lib/useAuth"
const List = ({ images }) => {
  const getRandomNumber = (max) => {
    return Math.ceil(Math.random() * max)
  }
  const [startingIndex, setStartingIndex] = useState(null)
  const flatListRef = useRef()
  const { incrementWear } = useAuth()
  const diceContainerRef = useRef()
  // const chosenFrag = useRef(null)
  const [dice, setDice] = useState("dice-6")
  const [prevNum, setPrevNum] = useState(null)
  const [chosenFrag, setChosenFrag] = useState()

  const timer = (ms) => new Promise((res) => setTimeout(res, ms))
  const rollDice = async () => {
    diceContainerRef.current.bounceIn()
    for (let i = 1; i < 6; i++) {
      await timer(20)
      setDice(`dice-${getRandomNumber(6)}`)
    }
  }
  const pickRandomFragrance = async () => {
    const index = getRandomFragranceIndex()
    setChosenFrag(images[getRandomFragranceIndex()])
    await flatListRef.current.scrollToIndex({
      animated: true,
      index: index,
      viewPosition: 0.5,
    })
    rollDice()
  }
  const getRandomFragranceIndex = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    setPrevNum(randomIndex)
    if (images.length > 1 && prevNum === randomIndex) {
      console.log("It was the same, rerolling")
      getRandomFragranceIndex()
    }
    return randomIndex
  }
  useLayoutEffect(() => {
    if (!chosenFrag) {
      const fragIndex = getRandomFragranceIndex()
      setChosenFrag(images[fragIndex])
      setStartingIndex(fragIndex)
    }
  }, [])
  return (
    <View style={tw("h-full w-full items-center py-5")}>
      <Text style={tw("text-white text-3xl mb-3 font-bold")}>Today's pick</Text>
      <View style={[styles.dice, tw("h-72 w-60 rounded-xl")]}>
        <FlatList
          ref={flatListRef}
          horizontal={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialScrollIndex={startingIndex}
          data={images}
          keyExtractor={(item, index) => item.id}
          renderItem={(item, index) => <ReelImage object={item} />}></FlatList>
      </View>
      <View style={tw("mt-12 flex-row")}>
        <View style={tw("items-center")}>
          <Text style={tw("items-center mb-2 text-lg text-white")}>Wear</Text>
          <TouchableOpacity
            onPress={() => incrementWear(chosenFrag)}
            style={tw("p-3 mx-12 items-center bg-green-300 rounded-full")}>
            <FontAwesome5 name='spray-can' size={40} color='black' />
          </TouchableOpacity>
        </View>
        <View style={tw("items-center")}>
          <Text style={tw("items-center mb-2 text-lg text-white")}>Reroll</Text>
          <TouchableOpacity
            onPress={pickRandomFragrance}
            style={tw("p-3 mx-12 items-center bg-red-400 rounded-full")}>
            <MaterialCommunityIcons name='dice-multiple' size={40} color='black' />
          </TouchableOpacity>
        </View>
      </View>
      <A.View ref={diceContainerRef} style={tw("mt-12 items-center")}>
        <MaterialCommunityIcons
          name={dice}
          onPress={pickRandomFragrance}
          style={styles.dice}
          color={getColor("gray-700")}
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

export default List
