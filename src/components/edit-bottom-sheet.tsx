import React, { useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { BottomSheet, Chip } from "@rneui/themed"
import { FontAwesome } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface EditBottomSheetProps {
  isVisible: boolean
  close: () => void
  item: { name: string }
  onSave: (newName: string) => void
}

const EditBottomSheet = ({ isVisible, close, item, onSave }: EditBottomSheetProps) => {
  const { theme, modalColors, baseBorderClass } = useTheme()
  const [brand, setBrand] = useState(item.name?.split(" - ")[0] ?? "")
  const [title, setTitle] = useState(item.name?.split(" - ")[1] ?? "")

  const handleSave = () => {
    const trimmedBrand = brand.trim()
    const trimmedTitle = title.trim()
    if (!trimmedBrand || !trimmedTitle) return
    onSave(`${trimmedBrand} - ${trimmedTitle}`)
    close()
  }

  return (
    <BottomSheet isVisible={isVisible} containerStyle={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <View
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        className={`${modalColors.background} py-5 px-6 items-center`}>
        <Text className={`${modalColors.font} text-xl mb-4 font-bold`}>Edit fragrance</Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder='Brand'
          placeholderTextColor={getColor("zinc-400")}
          className={`${modalColors.font} ${baseBorderClass} w-full border rounded-lg px-4 py-3 mb-3`}
        />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder='Title'
          placeholderTextColor={getColor("zinc-400")}
          className={`${modalColors.font} ${baseBorderClass} w-full border rounded-lg px-4 py-3 mb-6`}
        />
        <View className='flex-row'>
          <Chip
            title='Save'
            titleStyle={{ fontSize: 18 }}
            buttonStyle={{
              marginHorizontal: 20,
              paddingHorizontal: 20,
              backgroundColor: getColor("emerald-600"),
            }}
            onPress={handleSave}
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

export default EditBottomSheet
