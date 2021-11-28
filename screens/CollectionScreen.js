import React from "react"
import { View, FlatList } from "react-native"
import useAuth from "../Contexts/AuthContext"
import tw from "tailwind-rn"
import useTheme from "../Contexts/ThemeContext"
import CustomListItem from "../components/ListItem"

const CollectionScreen = () => {
  const { userCollection } = useAuth()
  const { viewColors } = useTheme()

  return (
    <View style={[tw(`flex-1 ${viewColors.background}`)]}>
      <FlatList
        data={userCollection.sort((el1, el2) => el1.times_worn < el2.times_worn)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          console.log(item.name)
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
