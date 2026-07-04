import React, { useState } from "react"
import { View, FlatList, ActivityIndicator, Text } from "react-native"
import { Chip } from "@rneui/themed"
import useData from "../../../../Contexts/DataContext"
import { getColor } from "../../../../lib/utils/colors"
import useTheme from "../../../../Contexts/ThemeContext"
import TopListItem from "../../../../components/TopListItem"

const TopPerfumesScreen = () => {
  const { data, options } = useData()
  const { theme, viewColors, baseTextClass } = useTheme()
  const [selected, setSelected] = useState(0)
  return (
    <View className={`${viewColors.background} flex-1`}>
      {!data ? (
        <ActivityIndicator color='blue' size='large' className='mt-24' />
      ) : (
        <View>
          <View className='border-b'>
            <Text
              className={`${viewColors.font} ${
                theme === "light" ? "bg-white" : "bg-gray-700"
              } text-2xl font-bold text-center py-2`}>
              Popular Fragrances
            </Text>
            <View
              className={`${
                theme === "light" ? "bg-white" : "bg-gray-700"
              } pb-2 flex-row justify-evenly w-full`}>
              {options.map((el, i) => {
                const isSelected = i === selected
                return (
                  <Chip
                    key={el}
                    type='outline'
                    containerStyle={{
                      borderRadius: 9999,
                      borderWidth: 2,
                      borderColor:
                        isSelected && theme === "light"
                          ? "black"
                          : isSelected && theme === "dark"
                          ? "white"
                          : getColor("gray-500"),
                      backgroundColor:
                        isSelected && theme === "light"
                          ? getColor("gray-700")
                          : isSelected && theme === "dark"
                          ? getColor("gray-900")
                          : undefined,
                    }}
                    buttonStyle={{ paddingHorizontal: 12, borderRadius: 9999 }}
                    titleStyle={{
                      color:
                        theme === "light" && isSelected
                          ? "white"
                          : getColor(baseTextClass.replace("text-", "")),
                    }}
                    title={el.toUpperCase()}
                    onPress={() => setSelected(i)}
                  />
                )
              })}
            </View>
          </View>
          <FlatList
            data={data[selected]}
            contentContainerClassName='py-3'
            keyExtractor={(item) => item.place}
            renderItem={({ item }) => {
              const { name, place, imageUrl, rating, totalVotes } = item
              return (
                <TopListItem
                  name={name}
                  place={place}
                  imageUrl={imageUrl}
                  rating={rating}
                  totalVotes={totalVotes}
                />
              )
            }}
          />
        </View>
      )}
    </View>
  )
}

export default TopPerfumesScreen
