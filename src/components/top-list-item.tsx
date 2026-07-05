import React from "react"
import { ListItem } from "@rneui/themed"
import { Image, TouchableOpacity, Text, View, type ImageSourcePropType } from "react-native"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"

const getImageSource = (value: string | null | undefined): ImageSourcePropType | null => {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  return /^(https?:)?\/\//i.test(trimmed) ? { uri: trimmed } : null
}

interface TopListItemProps {
  name: string
  place?: number | null
  imageUrl?: string | null
  rating?: number | string | null
  totalVotes?: number | string | null
}

const TopListItem = ({ name, place, imageUrl, rating, totalVotes }: TopListItemProps) => {
  const { addFragranceToCollection } = useAuth()
  const {
    theme,
    cardColors,
    cardBorderColors,
    baseColors,
    mutedColors,
    accentTextClass,
    mutedTextClass,
    buttons,
  } = useTheme()
  const title = name.split(" - ")[1]
  const brand = name.split(" - ")[0]
  const handleAddFragrance = () =>
    addFragranceToCollection({ name: name, image_url: imageUrl ?? null })
  const imageSource = getImageSource(imageUrl)

  return (
    <ListItem
      containerStyle={{
        backgroundColor: getColor(cardColors.background.replace("bg-", "")),
        borderWidth: 1,
        borderColor: getColor(cardBorderColors),
        borderRadius: 14,
        marginVertical: 4,
        marginHorizontal: 12,
        padding: 0,
        height: 84,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: theme === "light" ? 0.06 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: theme === "light" ? 2 : 0,
      }}>
      {place != null && (
        <View className='w-10 h-full justify-center items-center'>
          <Text className={`${mutedTextClass} text-base font-bold text-center`}>{place}</Text>
        </View>
      )}
      {imageSource ? (
        // White backing keeps product shots (white backgrounds) from clashing in dark mode
        <View className='h-[84px] w-20 items-center justify-center bg-white'>
          <Image className='h-16 w-16' resizeMode='contain' source={imageSource} />
        </View>
      ) : (
        <View className='h-[84px] w-20 items-center justify-center'>
          <MaterialCommunityIcons name='image-off' size={24} color={getColor(mutedColors)} />
        </View>
      )}
      <ListItem.Content style={{ padding: 0, paddingLeft: 12 }}>
        <ListItem.Title
          style={{ color: getColor(baseColors), fontWeight: "600" }}
          numberOfLines={1}>
          {title}
        </ListItem.Title>
        <ListItem.Subtitle style={{ color: getColor(mutedColors), fontSize: 13, paddingTop: 2 }}>
          {brand}
        </ListItem.Subtitle>
        <Text className={`${mutedTextClass} pt-1 text-xs`}>
          <Text className={`${accentTextClass} font-bold`}>{rating || "N/A"}</Text>
          {"  ·  "}
          {totalVotes || "N/A"} votes
        </Text>
      </ListItem.Content>
      <TouchableOpacity
        className={`${buttons.wearBg} h-10 w-10 justify-center mr-3 rounded-full items-center`}
        onPress={handleAddFragrance}>
        <AntDesign name='plus' color={getColor(buttons.wearIcon)} size={22} />
      </TouchableOpacity>
    </ListItem>
  )
}

export default TopListItem
