import React, { useState } from "react"
import { SearchBar } from "@rneui/themed"
import { FlatList, KeyboardAvoidingView, ActivityIndicator, Keyboard } from "react-native"
import { fetchData } from "../../../../lib/utils/fetchData"
import { getColor } from "../../../../lib/utils/colors"
import useTheme from "../../../../Contexts/ThemeContext"
import TopListItem from "../../../../components/TopListItem"

const SearchScreen = () => {
  const [data, setData] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { modalColors, viewColors, theme, baseTextClass } = useTheme()
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
    <KeyboardAvoidingView className={`${viewColors.background} flex-1`}>
      <SearchBar
        onSubmitEditing={() => handleSearch(searchTerm)}
        showLoading={loading}
        containerStyle={{
          backgroundColor: getColor(modalColors.background.replace("bg-", "")),
        }}
        inputContainerStyle={{
          backgroundColor: getColor(theme === "light" ? "gray-200" : "gray-600"),
          borderRadius: 9999,
          paddingHorizontal: 8,
        }}
        inputStyle={{ color: getColor(baseTextClass.replace("text-", "")) }}
        placeholder='Name (min 3 chars)'
        onChangeText={onChangeText}
        value={searchTerm}
      />
      {loading && <ActivityIndicator size='large' color='blue' className='mt-12' />}
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
