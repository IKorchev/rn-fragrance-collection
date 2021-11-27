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
                    selected === i ? `bg-gray-500 border-b border-${baseColors}` : ""
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
            contentContainerStyle={tw("items-center py-5")}
            data={top100[option]}
            keyExtractor={(item) => item.place}
            renderItem={({ item }) => {
              return (
                <View
                  style={tw(
                    `${modalColors.background} flex-row rounded-lg overflow-hidden mt-1 w-96`
                  )}>
                  <View style={tw("justify-center items-center w-12")}>
                    <Text style={tw(`${viewColors.font} text-2xl`)}>{item.place}</Text>
                  </View>
                  <Image
                    height='20'
                    width='20'
                    style={tw("h-20 w-20")}
                    source={{ uri: item.imageUrl }}
                  />
                  <View style={tw("flex-row flex-1 justify-between items-center")}>
                    <View style={tw("px-3 h-full")}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={tw(`${viewColors.font} text-lg font-bold`)}>
                        {item.name.split(" - ")[1]}
                      </Text>
                      <Text style={tw(`${viewColors.font}`)}>
                        {item.name.split(" - ")[0]}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const obj = {
                        name: item.name,
                        image_url: item.imageUrl,
                        times_worn: 0,
                      }
                      addFragranceToCollection(obj)
                    }}
                    style={tw("justify-center items-center w-12 bg-green-500")}>
                    <AntDesign name='hearto' size={20} />
                  </TouchableOpacity>
                </View>
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
