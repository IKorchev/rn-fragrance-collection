import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { BottomSheet, Chip, Icon } from "react-native-elements"
import tw from "tailwind-rn"

const DeleteBottomSheet = ({ isVisible, deleteItem, close, item }) => (
  <BottomSheet
    isVisible={isVisible}
    containerStyle={{ backgroundColor: "rgba(0.5, 0.25, 0, 0.6)" }}>
    <View
      style={[
        { borderTopLeftRadius: 55 },
        { borderTopRightRadius: 55 },
        tw("bg-white py-5  justify-center items-center"),
      ]}>
      <Text style={tw("text-black text-center text-xl ")}>Are you sure you want to delete</Text>
      <Text style={tw("text-black text-center text-xl mb-12")}>{item.name} ?</Text>
      <View style={tw(`flex-row`)}>
        <Chip
          icon={{
            name: "trash",
            type: "font-awesome",
            size: 20,
            color: "white",
          }}
          title='Delete'
          titleStyle={tw("text-lg")}
          buttonStyle={tw("mx-5 px-4 bg-red-500")}
          onPress={deleteItem}
        />
        <TouchableOpacity
          onPress={close}
          style={tw("flex-row rounded-full mx-5 justify-center items-center border px-5 ")}>
          <Icon type='font-awesome' name='close' />
          <Text style={tw("mx-2 text-lg")}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </BottomSheet>
)

export default DeleteBottomSheet
