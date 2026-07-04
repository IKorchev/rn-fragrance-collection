import React from "react"
import { View, Text, Image } from "react-native"
import useTheme from "../Contexts/ThemeContext"
const ReelImage = ({ name, url }) => {
  const { baseTextClass } = useTheme()
  return (
    <View className='flex-1 items-center'>
      <Text
        numberOfLines={1}
        className={`${baseTextClass} px-2 text-lg text-center font-bold py-2 w-full`}>
        {name}
      </Text>
      <Image resizeMode='contain' className='h-60 w-60 flex mx-1' source={{ uri: url }} />
    </View>
  )
}

export default ReelImage
