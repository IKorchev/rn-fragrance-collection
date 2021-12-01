import React, { useEffect, useState } from "react"
import { View, Text } from "react-native"
import tw from "tailwind-rn"
import useAuth from "../Contexts/AuthContext"
import Picker from "../components/Picker"
import useTheme from "../Contexts/ThemeContext"
import useData from "../Contexts/DataContext"

const Home = () => {
  const { frag } = useAuth()
  const { viewColors } = useTheme()
  const { index } = useData()
  return (
    <View
      style={tw(`${viewColors.background} h-full flex justify-center flex items-center`)}>
      {index >= 0 ? (
        <Picker fragrance={frag} index={index} />
      ) : (
        <Text>Nothing in here</Text>
      )}
    </View>
  )
}

export default Home
