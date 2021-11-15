import { useNavigation } from "@react-navigation/core"
import React, { useEffect, useState } from "react"
import { Text, View, TouchableOpacity, Button, FlatList, Image } from "react-native"
import { TextInput, TouchableHighlight } from "react-native-gesture-handler"
import { useForm, Controller } from "react-hook-form"
import { SafeAreaView } from "react-native-safe-area-context"
import { AntDesign } from "@expo/vector-icons"
import { fetchData } from "../lib/utils/fetchData"
import tw from "tailwind-rn"
import Modal from "react-native-modal"
import ModalContent from "../components/ModalContent"

const SearchScreen = () => {
  const [data, setData] = useState([])
  const [error, setError] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [urlToAdd, setUrlToAdd] = useState("")
  const [nameToAdd, setNameToAdd] = useState("")
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      searchTerm: "",
    },
  })

  const onSubmit = async ({ searchTerm }) => {
    const res = await fetchData(searchTerm)
    if (res.length) {
      setData(res)
      setError(false)
    } else {
      setError(true)
    }
  }
  const toggleModal = () => setOpenModal(!openModal)

  return (
    <SafeAreaView style={tw("h-full bg-blue-50")}>
      <View>
        <Modal
          isVisible={openModal}
          backdropColor='rgba(0,0,0,0.3)'
          onBackdropPress={toggleModal}>
          <ModalContent toggleModal={toggleModal} imageUrl={urlToAdd} />
        </Modal>
      </View>
      <Text style={tw("mb-2 font-bold text-3xl px-5")}>Find fragrances</Text>
      <View style={tw("mt-12 px-4")}>
        <View style={tw("flex flex-row h-10 rounded-md overflow-hidden border")}>
          <Controller
            control={control}
            rules={{
              required: true,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={tw("flex-grow px-3 ")}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder='Perfume Name'
              />
            )}
            name='searchTerm'
          />
          <TouchableOpacity
            style={tw(
              "flex flex-row justify-center text-center items-center px-2 bg-blue-400"
            )}
            onPress={handleSubmit(onSubmit)}>
            <AntDesign name='search1' style={tw("px-5")} size={22} color='white' />
          </TouchableOpacity>
        </View>
        <Text style={tw("mb-2 ml-2 text-xs")}>(min. 3 characters)</Text>
      </View>
      {data.length > 0 && (
        <View style={tw("px-2")}>
          <Text style={tw("mt-12 text-center")}>
            Click on the image to add to your collection
          </Text>
          <FlatList
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            data={data}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setUrlToAdd(item)
                  toggleModal()
                }}>
                <Image source={{ uri: item }} style={tw("h-36 w-36 mt-3 mx-1")} />
              </TouchableOpacity>
            )}></FlatList>
        </View>
      )}
      {error && <Text style={tw("mt-12 text-center")}>There were no results</Text>}
    </SafeAreaView>
  )
}

export default SearchScreen
