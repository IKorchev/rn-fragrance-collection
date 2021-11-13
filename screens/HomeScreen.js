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
  return <SafeAreaView style={tw("h-full bg-blue-50")}></SafeAreaView>
}

export default Home
