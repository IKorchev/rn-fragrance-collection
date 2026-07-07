import React from "react"
import { BlurView } from "expo-blur"
import { AntDesign } from "@expo/vector-icons"
import * as AppleAuthentication from "expo-apple-authentication"
import { ImageBackground, TouchableOpacity, Text, Platform } from "react-native"
import useAuth from "@/contexts/auth-context"

const BUTTON_WIDTH = 240

export default function SigninScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth()

  return (
    <BlurView
      intensity={250}
      tint='dark'
      style={{ padding: 100 }}
      className='flex-1 relative justify-center items-center'>
      <ImageBackground
        resizeMode='cover'
        className='w-full h-full absolute opacity-60'
        source={require("../../assets/spray.jpg")}></ImageBackground>
      <TouchableOpacity
        onPress={signInWithGoogle}
        style={{ width: BUTTON_WIDTH, height: 44 }}
        className='bg-white rounded-full flex-row items-center justify-center'>
        <AntDesign name='google' size={20} color='#dd4b39' />
        <Text className='ml-2 font-bold text-black'>Sign in with Google</Text>
      </TouchableOpacity>
      {/* App Store 4.8: Google sign-in requires an Apple sign-in option on iOS */}
      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={22}
          style={{ width: BUTTON_WIDTH, height: 44, marginTop: 14 }}
          onPress={signInWithApple}
        />
      )}
    </BlurView>
  )
}
