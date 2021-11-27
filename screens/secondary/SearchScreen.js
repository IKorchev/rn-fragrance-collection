import React, { useState } from "react"
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { fetchData } from "../../lib/utils/fetchData"
import tw from "tailwind-rn"
import useAuth from "../../Contexts/AuthContext"
import useTheme from "../../Contexts/ThemeContext"

const SearchScreen = ({ navigation }) => {
  const { addFragranceToCollection } = useAuth()
  const [fragranceUrl, setFragranceUrl] = useState("")
  const [data, setData] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [fragranceName, setFragranceName] = useState("")
  const { baseColors, modalColors, viewColors } = useTheme()
  const [loading, setLoading] = useState(false)

  const handleSearch = async (searchTerm) => {
    const data = await fetchData(searchTerm)
  }

  return (
    <View style={tw(`${viewColors.background} flex-1 p-7`)}>
      <Text style={tw(`${modalColors.font} my-2 font-bold text-2xl text-center`)}>
        Find fragrances
      </Text>

      <View style={tw(`flex flex-row h-12 rounded-lg overflow-hidden border`)}>
        <TextInput
          style={tw("text-black flex-1 px-3 bg-white ")}
          onChangeText={setSearchTerm}
          placeholder='Perfume name'
        />
        <TouchableOpacity
          style={tw(
            "flex flex-row justify-center text-center items-center px-2 rounded-lg bg-green-400"
          )}
          onPress={() => handleSearch(searchTerm)}>
          <AntDesign name='search1' style={tw("px-8")} size={22} color='white' />
        </TouchableOpacity>
      </View>
      <Text style={tw("text-white mb-2 ml-2 text-sm")}>(min. 3 characters)</Text>
      {data.length > 0 && (
        <View style={tw("px-2")}>
          <Text style={tw(`text-center font-bold  text-${baseColors}`)}>
            Choose an image
          </Text>
          <FlatList
            contentContainerStyle={tw("justify-center items-center h-32")}
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            data={data}
            keyExtractor={(item) => item.imageUrl}
            renderItem={({ item }) => (
              <TouchableOpacity
                //prettier-ignore
                style={tw(
                        item.imageUrl === fragranceUrl ? "border-2 border-red-300 m-1" : "m-1"
                      )}
                onPress={() => {
                  setFragranceUrl(item.imageUrl)
                }}>
                {/* {item.imageUrl === fragranceUrl && (
                      <Text
                        style={tw(
                          "text-red-400 font-bold z-20 -mt-3 text-center absolute top-1/2 w-full"
                        )}>
                        SELECTED
                      </Text>
                    )} */}
                <Image
                  style={tw(
                    `${item.imageUrl === fragranceUrl && "opacity-50"} h-24 w-24 `
                  )}
                  resizeMode='cover'
                  source={{ uri: item.imageUrl }}
                />
              </TouchableOpacity>
            )}
          />
          <Text style={tw(`text-${baseColors} my-1`)}>What would you call it?</Text>
          <TextInput
            placeholder='Name'
            style={tw("bg-white text-black border border-inset p-2   rounded-lg text-lg")}
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
          {error && <Text style={tw("mt-12 text-center")}>There were no results</Text>}
        </View>
      )}
    </View>
  )
}

export default SearchScreen
