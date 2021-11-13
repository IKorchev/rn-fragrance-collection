import { useNavigation } from "@react-navigation/core"
import React, { useEffect, useState } from "react"
import { Text, View, TouchableOpacity, Button, FlatList, Image } from "react-native"
import { TextInput } from "react-native-gesture-handler"
import { useForm, Controller } from "react-hook-form"
import { SafeAreaView } from "react-native-safe-area-context"
import { AntDesign } from "@expo/vector-icons"
import { fetchData } from "../lib/utils/fetchData"
import tw from "tailwind-rn"
import useAuth from "../lib/useAuth"

const Home = ({ navigation }) => {
  const { logOut } = useAuth()
  const [data, setData] = useState([])
  const [error, setError] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      searchTerm: "",
    },
  })

  const onSubmit = async ({ searchTerm }) => {
    const res = await fetchData(searchTerm)
    if (res.length) {
      setData(res)
      setError(false)
    } else {
      setError(true)
    }
  }

  const navigator = useNavigation()
  return (
    <SafeAreaView style={tw("")}>
      <TouchableOpacity onPress={() => navigator.navigate("Profile")}>
        <Text>Go to Profile page</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logOut}>
        <Text>Log out</Text>
      </TouchableOpacity>
      <View style={tw("mt-24 px-4")}>
        <Text>Search for an image</Text>
        <View style={tw("flex flex-row h-10 rounded-md overflow-hidden border")}>
          <Controller
            control={control}
            rules={{
              required: true,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={tw("flex-grow px-3 ")}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder='Perfume Name(s)'
              />
            )}
            name='searchTerm'
          />
          <TouchableOpacity
            style={tw(
              "flex flex-row justify-center text-center items-center px-2 bg-blue-800"
            )}
            onPress={handleSubmit(onSubmit)}>
            <AntDesign name='search1' style={tw("px-5")} size={22} color='white' />
          </TouchableOpacity>
        </View>
      </View>
      {data.length > 0 && (
        <View style={tw("px-2")}>
          <Text style={tw("mt-12 text-center")}>
            Click on the image to add to your collection
          </Text>
          <FlatList
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            data={data}
            renderItem={({ item, index }) => (
              <Image
                source={{ uri: item }}
                key={item}
                style={tw("h-36 w-36 mt-3 mx-1")}
              />
            )}></FlatList>
        </View>
      )}
      {error && <Text style={tw("mt-12 text-center")}>There were no results</Text>}
    </SafeAreaView>
  )
}

export default Home
