import React from "react"
import { BlurView } from "expo-blur"
import { AntDesign } from "@expo/vector-icons"
import { ImageBackground, TouchableOpacity, Text } from "react-native"
import useAuth from "@/contexts/auth-context"

export default function SigninScreen() {
  const { signInWithGoogle } = useAuth()

  return (
    <BlurView
      intensity={250}
      tint='dark'
      style={{ padding: 100}}
      className='flex-1 relative justify-center items-center'>
      <ImageBackground
        resizeMode='contain'
        className='w-full h-full absolute opacity-60'
        source={{
          uri: "https://p.kindpng.com/picc/s/23-239314_png-perfumes-perfume-images-png-transparent-png.png",
        }}></ImageBackground>
      <TouchableOpacity
        onPress={signInWithGoogle}
        className='px-5 py-3 bg-white rounded-full flex-row items-center'>
        <AntDesign name='google' size={20} color='#dd4b39' />
        <Text className='ml-2 font-bold text-black'>Sign In With Google</Text>
      </TouchableOpacity>
    </BlurView>
  )
}
