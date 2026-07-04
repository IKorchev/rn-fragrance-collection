import React from "react"
import { View, ActivityIndicator } from "react-native"
import useAuth from "../../../Contexts/AuthContext"
import Picker from "../../../components/Picker"
import useTheme from "../../../Contexts/ThemeContext"
import useData from "../../../Contexts/DataContext"

const Home = () => {
  const { frag } = useAuth()
  const { viewColors } = useTheme()
  const { index } = useData()
  return (
    <View className={`${viewColors.background} h-full flex justify-center flex items-center`}>
      {index >= 0 ? <Picker fragrance={frag} index={index} /> : <ActivityIndicator color='blue' />}
    </View>
  )
}

export default Home
