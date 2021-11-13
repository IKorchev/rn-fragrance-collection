import React from "react"
import { View, Text, ImageBackground } from "react-native"
import { TouchableOpacity } from "react-native-gesture-handler"
import tailwind from "tailwind-rn"
import { AntDesign } from "@expo/vector-icons"
import useAuth from "../lib/useAuth"
export default function SigninScreen() {
  const { signInWithGoogle } = useAuth()

  return (
    <View style={tailwind("flex-1")}>
      <ImageBackground
        resizeMode='contain'
        style={tailwind("flex-1 justify-center items-center")}
        source={{
          uri: "https://p.kindpng.com/picc/s/23-239314_png-perfumes-perfume-images-png-transparent-png.png",
        }}>
        <TouchableOpacity
          onPress={signInWithGoogle}
          style={tailwind(
            " w-60 mt-96 bg-white py-3 rounded-xl border border-black flex flex-row justify-center items-center "
          )}>
          <AntDesign name='google' style={tailwind("mr-3")} size={20} color='black' />
          <Text style={tailwind("text-center font-semibold text-lg")}>
            Sign in with Google
          </Text>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  )
}
