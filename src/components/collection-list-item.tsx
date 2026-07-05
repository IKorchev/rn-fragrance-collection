import React, { useState } from "react"
import { ListItem } from "@rneui/themed"
import { Image, TouchableOpacity, Text, View, type ImageSourcePropType } from "react-native"
import { AntDesign, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth, { type FragranceInput } from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import DeleteBottomSheet from "./delete-bottom-sheet"
import EditBottomSheet from "./edit-bottom-sheet"

const getImageSource = (value: string | null | undefined): ImageSourcePropType | null => {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  return /^(https?:)?\/\//i.test(trimmed) ? { uri: trimmed } : null
}

const formatLastWorn = (timestamp: string | null | undefined): string => {
  if (!timestamp) return "Never worn"
  // last_worn is a TIMESTAMPTZ → ISO string from Postgres
  const diffDays = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Last worn today"
  if (diffDays === 1) return "Last worn yesterday"
  return `Last worn ${diffDays} days ago`
}

interface CustomListItemProps {
  name: string
  place?: number | null
  imageUrl: string | null
  timesWorn?: number
  lastWorn?: string | null
  inCollection?: boolean
  id?: string
}

const CustomListItem = ({
  name,
  place,
  imageUrl,
  timesWorn,
  lastWorn,
  inCollection,
  id,
}: CustomListItemProps) => {
  const obj: FragranceInput = inCollection
    ? {
        name: name,
        image_url: imageUrl,
        id: id,
      }
    : {
        name: name,
        image_url: imageUrl,
      }
  const { addFragranceToCollection, incrementWear, requestDelete, cancelDelete, updateFragrance } =
    useAuth()
  const { showToast } = useToast()
  const { theme, cardColors, cardBorderColors, baseColors, mutedColors, baseTextClass, buttons } =
    useTheme()
  const [isDeleteVisible, setIsDeleteVisible] = useState(false)
  const [isEditVisible, setIsEditVisible] = useState(false)
  const imageSource = getImageSource(imageUrl)

  const handleDelete = () => {
    setIsDeleteVisible(false)
    if (!obj.id) return
    requestDelete({ id: obj.id })
    showToast({
      message: `${name.split(" - ")[1]} deleted`,
      actionLabel: "Undo",
      onAction: () => cancelDelete(obj.id!),
    })
  }

  return (
    <ListItem.Swipeable
      rightWidth={124}
      // Edit/Delete are behind a left swipe so the row itself stays readable —
      // only the everyday action (Wear) gets a permanent button.
      rightContent={
        inCollection
          ? (reset) => (
              <View className='flex-1 flex-row items-center justify-end pr-4' style={{ gap: 10 }}>
                <TouchableOpacity
                  className={`${buttons.editBg} h-11 w-11 justify-center rounded-full items-center`}
                  onPress={() => {
                    reset()
                    setIsEditVisible(true)
                  }}>
                  <AntDesign name='edit' color={getColor(buttons.editIcon)} size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  className={`${buttons.deleteBg} h-11 w-11 justify-center rounded-full items-center`}
                  onPress={() => {
                    reset()
                    setIsDeleteVisible(true)
                  }}>
                  <AntDesign name='delete' color={getColor(buttons.deleteIcon)} size={18} />
                </TouchableOpacity>
              </View>
            )
          : undefined
      }
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
      {isDeleteVisible && (
        <DeleteBottomSheet
          isVisible={isDeleteVisible}
          close={() => setIsDeleteVisible(false)}
          deleteItem={handleDelete}
          item={obj}
        />
      )}
      {isEditVisible && (
        <EditBottomSheet
          isVisible={isEditVisible}
          close={() => setIsEditVisible(false)}
          item={obj}
          onSave={(newName) => {
            if (obj.id) updateFragrance({ id: obj.id }, { name: newName })
          }}
        />
      )}
      {place != null && (
        <View className='w-10 h-full justify-center items-center'>
          <Text className={`${baseTextClass} text-lg font-bold text-center`}>{place}</Text>
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
          {name.split(" - ")[1]}
        </ListItem.Title>
        <ListItem.Subtitle style={{ color: getColor(mutedColors), fontSize: 13, paddingTop: 2 }}>
          {name.split(" - ")[0]}
        </ListItem.Subtitle>
        {inCollection && (
          <ListItem.Subtitle
            style={{ color: getColor(mutedColors), fontSize: 12, paddingTop: 3 }}
            numberOfLines={1}>
            Worn {timesWorn}x · {formatLastWorn(lastWorn)}
          </ListItem.Subtitle>
        )}
      </ListItem.Content>
      {!inCollection ? (
        <TouchableOpacity
          className={`${buttons.wearBg} h-11 w-11 justify-center mr-3 rounded-full items-center`}
          onPress={() => addFragranceToCollection(obj)}>
          <AntDesign name='plus' color={getColor(buttons.wearIcon)} size={22} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className={`${buttons.wearBg} h-11 w-11 justify-center mr-3 rounded-full items-center`}
          onPress={() => obj.id && incrementWear({ id: obj.id })}>
          <FontAwesome5 name='spray-can' color={getColor(buttons.wearIcon)} size={17} />
        </TouchableOpacity>
      )}
    </ListItem.Swipeable>
  )
}

export default CustomListItem
