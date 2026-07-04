import React, { useState } from "react"
import { View, Text, Image } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useTheme from "../Contexts/ThemeContext"
import { getColor } from "../lib/utils/colors"

const getImageSource = (value) => {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  return /^(https?:)?\/\//i.test(trimmed) ? { uri: trimmed } : null
}

const ReelImage = ({ name, url, imageUrl }) => {
  const { baseTextClass } = useTheme()
  const [hasImageError, setHasImageError] = useState(false)
  const resolvedUrl = url || imageUrl
  const imageSource = getImageSource(resolvedUrl)

  return (
    <View className='flex-1 items-center justify-center px-2 py-2'>
      <Text
        numberOfLines={1}
        className={`${baseTextClass} px-2 text-lg text-center font-bold py-2 w-full`}>
        {name}
      </Text>
      {imageSource && !hasImageError ? (
        <Image
          resizeMode='contain'
          className='h-60 w-60 mx-1'
          source={imageSource}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <View className='h-60 w-60 mx-1 items-center justify-center rounded-xl border border-gray-300'>
          <MaterialCommunityIcons name='image-off' size={36} color={getColor("gray-400")} />
        </View>
      )}
    </View>
  )
}

export default ReelImage
