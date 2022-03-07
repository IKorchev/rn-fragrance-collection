import React from "react"
import { BlurView } from "expo-blur"
import { SocialIcon } from "react-native-elements"
import {ImageBackground } from "react-native"
import tw from "tailwind-rn"
import useAuth from "../Contexts/AuthContext"
export default function SigninScreen() {
  const { signInWithGoogle } = useAuth()

  return (
    <BlurView
      intensity={250}
      tint='dark'
      style={tw("flex-1 relative justify-center items-center")}>
      <ImageBackground
        resizeMode='contain'
        style={tw("w-full h-full absolute opacity-60")}
        source={{
          uri: "https://p.kindpng.com/picc/s/23-239314_png-perfumes-perfume-images-png-transparent-png.png",
        }}></ImageBackground>
      <SocialIcon
        onPress={signInWithGoogle}
        title='Sign In With Google'
        button
        raised
        type='google'
        style={tw("px-5 bg-white")}
        iconColor='black'
        fontStyle={{ color: "black" }}
      />
    </BlurView>
  )
}
