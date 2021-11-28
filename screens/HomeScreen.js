import { useNavigation } from "@react-navigation/core"
import React from "react"
import { View, Text, TouchableOpacity } from "react-native"
import tw from "tailwind-rn"
import useAuth from "../Contexts/AuthContext"
import Picker from "../components/Picker"
import useTheme from "../Contexts/ThemeContext"
const Home = () => {
  const { userCollection } = useAuth()
  const navigator = useNavigation()
  const { viewColors } = useTheme()
  return (
    <View
      //prettier-ignore
      style={tw(`${viewColors.background}  h-full flex justify-center flex items-center`)}>
        <Picker colors={viewColors} images={userCollection} />
        
     
     
    </View>
  )
}

export default Home
