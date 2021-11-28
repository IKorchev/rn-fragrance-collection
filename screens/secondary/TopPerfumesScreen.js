import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import useData from "../../Contexts/DataContext"
import tw from "tailwind-rn"
import useTheme from "../../Contexts/ThemeContext"
import useAuth from "../../Contexts/AuthContext"
import CustomListItem from "../../components/ListItem"

const data = ["men", "women", "unisex"]

const TopPerfumesScreen = () => {
  const { addFragranceToCollection } = useAuth()
  const { top100 } = useData()
  const { theme, viewColors, baseColors, modalColors } = useTheme()
  const [option, setOption] = useState("men")
  const [selected, setSelected] = useState(0)

  return (
    <View style={tw(`${viewColors.background} flex-1`)}>
      {!top100 ? (
        <ActivityIndicator color='blue' size='large' style={tw("mt-24")} />
      ) : (
        <>
          <View
            style={tw(
              ` ${
                theme === "light" ? "bg-white" : "bg-gray-700"
              } flex-row justify-evenly w-full`
            )}>
            {Object.keys(top100).map((el, i) => (
              <TouchableOpacity
                key={el}
                onPress={() => {
                  setSelected(i)
                  setOption(el)
                }}
                style={tw(
                  `${
                    selected === i
                      ? `${viewColors.background} border-b border-${baseColors}`
                      : ""
                  }  flex-1 p-3 px-5 `
                )}>
                <Text
                  style={tw(
                    `${selected === i ? "font-bold" : ""} text-${baseColors} text-center`
                  )}>
                  {el.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={top100[option]}
            keyExtractor={(item) => item.place}
            renderItem={({ item }) => {
              return (
                <CustomListItem
                  name={item.name}
                  place={item.place}
                  imageUrl={item.imageUrl}
                />
              )
            }}
          />
        </>
      )}

      <View style={tw("mt-2")} />
    </View>
  )
}

export default TopPerfumesScreen
