import React from "react"
import { BlurView } from "expo-blur"
import { View, Text, ImageBackground } from "react-native"
import { TouchableOpacity } from "react-native-gesture-handler"
import tailwind from "tailwind-rn"
import { AntDesign } from "@expo/vector-icons"
import useAuth from "../Contexts/AuthContext"
export default function SigninScreen() {
  const { signInWithGoogle } = useAuth()

  return (
    <BlurView
      intensity={100}
      tint='dark'
      style={tailwind("flex-1 relative justify-center items-center")}>
      <ImageBackground
        resizeMode='contain'
        style={tailwind("w-full h-full absolute opacity-60")}
        source={{
          uri: "https://p.kindpng.com/picc/s/23-239314_png-perfumes-perfume-images-png-transparent-png.png",
        }}></ImageBackground>
      <TouchableOpacity
        onPress={signInWithGoogle}
        style={tailwind(
          "w-60 mt-96 bg-white py-3 rounded-xl z-50 border border-black flex flex-row justify-center items-center "
        )}>
        <AntDesign name='google' style={tailwind("mr-3")} size={28} color='black' />
        <Text style={tailwind("text-center font-semibold text-lg")}>
          Sign in with Google
        </Text>
      </TouchableOpacity>
    </BlurView>
  )
}
