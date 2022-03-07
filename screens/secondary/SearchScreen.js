import React, { useState } from "react"
import { SearchBar } from "react-native-elements"
import { FlatList, KeyboardAvoidingView, ActivityIndicator, Keyboard } from "react-native"
import { fetchData } from "../../lib/utils/fetchData"
import tw from "tailwind-rn"
import useTheme from "../../Contexts/ThemeContext"
import TopListItem from "../../components/TopListItem"

const SearchScreen = () => {
  const [data, setData] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { baseColors, modalColors, viewColors, theme } = useTheme()
  const [loading, setLoading] = useState(false)

  const onChangeText = (input) => {
    setSearchTerm(input)
  }

  const handleSearch = async (searchTerm) => {
    setLoading(true)
    setData([])
    Keyboard.dismiss()
    try {
      const res = await fetchData(searchTerm)
      setLoading(false)
      setData(res)
      console.log(res)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <KeyboardAvoidingView style={tw(`${viewColors.background} flex-1 `)}>
      <SearchBar
        onSubmitEditing={() => handleSearch(searchTerm)}
        showLoading={loading}
        containerStyle={tw(`${modalColors.background}`)}
        inputContainerStyle={tw(
          `${theme === "light" ? "bg-gray-200" : "bg-gray-600"} rounded-full px-2`
        )}
        inputStyle={tw(`text-${baseColors}`)}
        placeholder='Name (min 3 chars)'
        onChangeText={onChangeText}
        value={searchTerm}
      />
      {loading && <ActivityIndicator size='large' color='blue' style={tw("mt-12")} />}
      {data && (
        <FlatList
          data={data}
          keyExtractor={(item) => item.imageUrl}
          renderItem={({ item }) => {
            const { place, name, imageUrl, rating, totalVotes } = item
            return (
              <TopListItem
                place={place}
                name={name}
                imageUrl={imageUrl}
                rating={rating}
                totalVotes={totalVotes}
              />
            )
          }}
        />
      )}
    </KeyboardAvoidingView>
  )
}

export default SearchScreen
