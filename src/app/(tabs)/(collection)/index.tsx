import React from "react"
import { View, FlatList } from "react-native"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import CustomListItem from "@/components/collection-list-item"

const CollectionScreen = () => {
  const { visibleSortedCollection } = useAuth()
  const { viewColors } = useTheme()

  return (
    <View className={`flex-1 ${viewColors.background}`}>
      <FlatList
        data={visibleSortedCollection}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          return (
            <CustomListItem
              name={item.name}
              inCollection={true}
              imageUrl={item.image_url}
              timesWorn={item.times_worn}
              lastWorn={item.last_worn}
              id={item.id}
            />
          )
        }}
      />
    </View>
  )
}

export default CollectionScreen
