import React from "react"
import { View, Text, FlatList, ActivityIndicator } from "react-native"
import useAuth from "@/contexts/auth-context"
import Picker from "@/components/picker"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"
import { useCatalog } from "@/lib/queries"
import TopListItem from "@/components/top-list-item"

const Home = () => {
  const { frag, index } = useAuth()
  const { viewColors, mutedTextClass, accentColors } = useTheme()
  const { data: catalog, isLoading: catalogLoading } = useCatalog()

  return (
    <View className={`${viewColors.background} flex-1`}>
      <FlatList
        data={catalog ?? []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Picker fragrance={frag} index={index} />
            <Text className={`${viewColors.font} text-2xl font-bold px-4 pb-3`}>Discover</Text>
          </>
        }
        ListEmptyComponent={
          catalogLoading ? (
            <ActivityIndicator color={getColor(accentColors)} size='large' className='my-6' />
          ) : (
            <Text className={`${mutedTextClass} text-center my-6 px-6`}>
              No fragrances in the catalog yet.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TopListItem
            name={`${item.brand} - ${item.name}`}
            imageUrl={item.image_url}
            rating={item.rating}
            totalVotes={item.votes}
          />
        )}
      />
    </View>
  )
}

export default Home
