import React, { useState } from "react"
import { SearchBar } from "@rneui/themed"
import { FlatList, KeyboardAvoidingView, ActivityIndicator, Keyboard, Text } from "react-native"
import { useFragranceSearch, MIN_SEARCH_LENGTH } from "@/lib/queries"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import TopListItem from "@/components/top-list-item"

const SearchScreen = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [submittedTerm, setSubmittedTerm] = useState("")
  const [tooShort, setTooShort] = useState(false)
  const { viewColors, theme, baseColors, mutedColors, mutedTextClass, accentColors, headerColors } = useTheme()

  const { data, isFetching, error } = useFragranceSearch(submittedTerm)

  const handleSearch = () => {
    Keyboard.dismiss()
    if (searchTerm.trim().length < MIN_SEARCH_LENGTH) {
      setTooShort(true)
      setSubmittedTerm("")
      return
    }
    setTooShort(false)
    setSubmittedTerm(searchTerm)
  }

  return (
    <KeyboardAvoidingView className={`${viewColors.background} flex-1`}>
      <SearchBar
        onSubmitEditing={handleSearch}
        showLoading={isFetching}
        containerStyle={{
          backgroundColor: getColor(headerColors.background.replace("bg-", "")),
        }}
        inputContainerStyle={{
          backgroundColor: getColor(theme === "light" ? "zinc-100" : "zinc-800"),
          borderRadius: 9999,
          paddingHorizontal: 8,
        }}
        inputStyle={{ color: getColor(baseColors) }} placeholderTextColor={getColor(mutedColors)}
        placeholder='Name (min 3 chars)'
        onChangeText={setSearchTerm}
        value={searchTerm}
      />
      {isFetching && <ActivityIndicator size="large" color={getColor(accentColors)} className="mt-12" />}
      {!isFetching && tooShort && (
        <Text className={`${mutedTextClass} text-center mt-6 px-6`}>
          Please enter at least {MIN_SEARCH_LENGTH} characters.
        </Text>
      )}
      {!isFetching && !tooShort && error && (
        <Text className={`${mutedTextClass} text-center mt-6 px-6`}>
          Something went wrong, please try again.
        </Text>
      )}
      {!isFetching && !tooShort && !error && data && data.length === 0 && (
        <Text className={`${mutedTextClass} text-center mt-6 px-6`}>No results found.</Text>
      )}
      {!isFetching && !error && data && data.length > 0 && (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.imageUrl ?? item.name)}
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
