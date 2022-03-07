import React from "react"
import { View, FlatList } from "react-native"
import useAuth from "../Contexts/AuthContext"
import tw from "tailwind-rn"
import useTheme from "../Contexts/ThemeContext"
import CustomListItem from "../components/CollectionListItem"

const CollectionScreen = () => {
  const { sortedCollection } = useAuth()
  const { viewColors } = useTheme()

  return (
    <View style={[tw(`flex-1 ${viewColors.background}`)]}>
      <FlatList
        data={sortedCollection}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          return (
            <CustomListItem
              name={item.name}
              inCollection={true}
              imageUrl={item.image_url}
              timesWorn={item.times_worn}
              id={item.id}
            />
          )
        }}
      />
    </View>
  )
}

export default CollectionScreen
