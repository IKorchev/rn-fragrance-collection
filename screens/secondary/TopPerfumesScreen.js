import React, { useState } from "react"
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from "react-native"
import { Chip } from "react-native-elements"
import useData from "../../Contexts/DataContext"
import tw from "tailwind-rn"
import useTheme from "../../Contexts/ThemeContext"
import TopListItem from "../../components/TopListItem"

const TopPerfumesScreen = () => {
  const { data, options } = useData()
  const { theme, viewColors, baseColors } = useTheme()
  const [selected, setSelected] = useState(0)
  return (
    <View style={tw(`${viewColors.background} flex-1`)}>
      {!data ? (
        <ActivityIndicator color='blue' size='large' style={tw("mt-24")} />
      ) : (
        <View>
          <View style={tw("border-b")}>
            <Text
              style={tw(
                `${viewColors.font} ${
                  theme === "light" ? "bg-white" : "bg-gray-700"
                } text-2xl font-bold text-center py-2`
              )}>
              Popular Fragrances
            </Text>
            <View
              style={tw(
                ` ${
                  theme === "light" ? "bg-white" : "bg-gray-700"
                } pb-2 flex-row justify-evenly w-full`
              )}>
              {options.map((el, i) => (
                <Chip
                  key={el}
                  type='outline'
                  containerStyle={tw(
                    ` rounded-full border-2 border-gray-500 ${
                      i === selected && theme === "light"
                        ? "bg-gray-700 border-black"
                        : i === selected && theme === "dark"
                        ? "bg-gray-900  border-white"
                        : ""
                    }`
                  )}
                  buttonStyle={tw(`px-3 rounded-full`)}
                  titleStyle={tw(
                    `text-${baseColors} text-${theme === "light" && i === selected ? "white" : ""}`
                  )}
                  title={el.toUpperCase()}
                  onPress={() => setSelected(i)}
                />
              ))}
            </View>
          </View>
          <FlatList
            data={data[selected]}
            contentContainerStyle={tw("py-3")}
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

const shadow = StyleSheet.create({
  shadowOpacity: 1,
  shadowRadius: 25,
  shadowOffset: {
    height: 5,
    width: 5,
  },
  elevation: 25,
})

export default TopPerfumesScreen
