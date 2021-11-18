import React, { useState } from "react"
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { fetchData } from "../lib/utils/fetchData"
import tw from "tailwind-rn"
import Modal from "react-native-modal"
import useAuth from "../lib/useAuth"

const SearchModal = ({ isOpen, toggleModal }) => {
  const { user, addFragranceToCollection } = useAuth()
  const [clicked, setClicked] = useState(false)
  const [data, setData] = useState([])
  const [error, setError] = useState(false)
  const [fragranceUrl, setFragranceUrl] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [fragranceName, setFragranceName] = useState("")

  const handleSearch = async (searchTerm) => {
    const res = await fetchData(searchTerm)
    if (!res.length) {
      setError(true)
    }
    setData(res)
    setError(false)
  }

  return (
    <View style={tw("relative")}>
      <Modal
        animationIn='fadeIn'
        animationOut='fadeOut'
        isVisible={isOpen}
        coverScreen={true}
        onBackdropPress={() => toggleModal(false)}
        backdropColor='rgba(0,0,0,0.9)'>
        <View style={tw("my-2 bg-gray-900 justify-center p-7 rounded-lg")}>
          <Text style={tw("my-2 font-bold text-2xl text-center text-white")}>
            Find fragrances
          </Text>
          <TouchableOpacity
            style={tw(
              "absolute top-2 right-2 flex justify-center text-center items-center px-2"
            )}
            onPress={() => toggleModal(false)}>
            <AntDesign name='close' size={28} color='white' />
          </TouchableOpacity>
          <View
            style={tw(
              `flex flex-row h-12 rounded-lg overflow-hidden border ${
                error && "border-red-500"
              }`
            )}>
            <TextInput
              style={tw("text-black flex-1 px-3 bg-white ")}
              onChangeText={setSearchTerm}
              placeholder='Perfume name'
            />
            <TouchableOpacity
              style={tw(
                "flex flex-row justify-center text-center items-center px-2 bg-green-400"
              )}
              onPress={() => handleSearch(searchTerm)}>
              <AntDesign name='search1' style={tw("px-8")} size={22} color='white' />
            </TouchableOpacity>
          </View>
          <Text style={tw("text-white mb-2 ml-2 text-sm")}>(min. 3 characters)</Text>
          {data.length > 0 && (
            <View style={tw("px-2")}>
              <Text style={tw("text-center font-bold  text-white")}>Choose an image</Text>
              <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                data={data}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    key={item}
                    onFocus={() => {
                      setClicked(true)
                      console.log(clicked)
                    }}
                    onBlur={() => {}}
                    onPress={() => {
                      setFragranceUrl(item)
                    }}>
                    <Image source={{ uri: item }} style={tw("h-24 w-24 mt-3 mx-1")} />
                  </TouchableOpacity>
                )}
              />
              <TextInput
                placeholder='Name'
                style={tw("bg-white text-black border p-2 mt-5  rounded-lg text-lg")}
                onChangeText={setFragranceName}
              />
              <TouchableOpacity
                onPress={() => {
                  const object = {
                    image_url: fragranceUrl,
                    name: fragranceName,
                    times_worn: 0,
                  }
                  addFragranceToCollection(object)
                }}>
                <View style={tw("bg-green-300  p-3 rounded-lg mt-5")}>
                  <Text style={tw("text-center")}>Add to collection</Text>
                </View>
              </TouchableOpacity>
              {error && (
                <Text style={tw("mt-12 text-center")}>There were no results</Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}

export default SearchModal
