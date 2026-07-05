import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { BottomSheet, Chip } from "@rneui/themed"
import { FontAwesome } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface DeleteBottomSheetProps {
  isVisible: boolean
  deleteItem: () => void
  close: () => void
  item: { name: string }
}

const DeleteBottomSheet = ({ isVisible, deleteItem, close, item }: DeleteBottomSheetProps) => {
  const { theme, modalColors, baseBorderClass } = useTheme()

  return (
    <BottomSheet
      isVisible={isVisible}
      containerStyle={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <View
        style={{ borderTopLeftRadius: 55, borderTopRightRadius: 55 }}
        className={`${modalColors.background} py-5 justify-center items-center`}>
        <Text className={`${modalColors.font} text-center text-xl`}>
          Are you sure you want to delete
        </Text>
        <Text className={`${modalColors.font} text-center text-xl mb-12`}>{item.name} ?</Text>
        <View className='flex-row'>
          <Chip
            icon={<FontAwesome name='trash' size={20} color='white' />}
            title='Delete'
            titleStyle={{ fontSize: 18 }}
            buttonStyle={{
              marginHorizontal: 20,
              paddingHorizontal: 16,
              backgroundColor: getColor("rose-500"),
            }}
            onPress={deleteItem}
          />
          <TouchableOpacity
            onPress={close}
            className={`${baseBorderClass} flex-row rounded-full mx-5 justify-center items-center border px-5`}>
            <FontAwesome name='close' size={22} color={theme === "dark" ? "white" : "black"} />
            <Text className={`${modalColors.font} mx-2 text-lg`}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  )
}

export default DeleteBottomSheet
