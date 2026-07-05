import React, { useState } from "react"
import { View, Text, Image, type ImageSourcePropType } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"

const getImageSource = (value: string | null | undefined): ImageSourcePropType | null => {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  return /^(https?:)?\/\//i.test(trimmed) ? { uri: trimmed } : null
}

interface ReelImageProps {
  name: string
  url?: string | null
  imageUrl?: string | null
}

const ReelImage = ({ name, url, imageUrl }: ReelImageProps) => {
  const { baseTextClass, baseBorderClass, mutedColors } = useTheme()
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
        <View
          className={`h-60 w-60 mx-1 items-center justify-center rounded-xl border ${baseBorderClass}`}>
          <MaterialCommunityIcons name='image-off' size={36} color={getColor(mutedColors)} />
        </View>
      )}
    </View>
  )
}

export default ReelImage
