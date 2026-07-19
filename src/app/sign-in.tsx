import React from "react"
import { AntDesign } from "@expo/vector-icons"
import * as AppleAuthentication from "expo-apple-authentication"
import { Platform, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { SignInBackdrop, SignInHero } from "@/components/sign-in-hero"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"

const MAX_CONTENT_WIDTH = 320
const BUTTON_HEIGHT = 52

export default function SigninScreen() {
  const router = useRouter()
  const { signInWithGoogle, signInWithApple } = useAuth()
  const {
    theme,
    viewColors,
    baseTextClass,
    mutedTextClass,
    accentTextClass,
  } = useTheme()
  const dark = theme === "dark"

  return (
    <View className={`flex-1 ${viewColors.background}`}>
      <SignInBackdrop />
      <SafeAreaView className='flex-1'>
        <View className='flex-1 items-center justify-center px-8'>
          <View
            className={`items-center justify-center rounded-full p-9 ${
              dark ? "bg-emerald-500/10" : "bg-emerald-100/60"
            }`}>
            <SignInHero size={150} />
          </View>

          <Text
            className={`mt-8 text-center font-display text-4xl tracking-tight ${baseTextClass}`}>
            <Text className={accentTextClass}>Whiff</Text>
          </Text>
          <Text
            className={`mt-3 text-center text-base leading-6 ${mutedTextClass}`}
            style={{ maxWidth: MAX_CONTENT_WIDTH }}>
            Your nose knows. Build your collection, log every spritz, and let
            the picker decide what today smells like.
          </Text>

          <View className='mt-12 w-full' style={{ maxWidth: MAX_CONTENT_WIDTH }}>
            <TouchableOpacity
              onPress={signInWithGoogle}
              activeOpacity={0.85}
              style={{ height: BUTTON_HEIGHT }}
              className={`w-full flex-row items-center justify-center rounded-2xl border bg-white ${
                dark ? "border-white" : "border-zinc-200"
              }`}>
              <AntDesign name='google' size={20} color='#dd4b39' />
              <Text className='ml-3 text-base font-semibold text-zinc-900'>
                Continue with Google
              </Text>
            </TouchableOpacity>
            {/* App Store 4.8: Google sign-in requires an Apple sign-in option on iOS */}
            {Platform.OS === "ios" && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  dark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={16}
                style={{ width: "100%", height: BUTTON_HEIGHT, marginTop: 14 }}
                onPress={signInWithApple}
              />
            )}
          </View>

          <Text
            className={`mt-6 text-center text-xs leading-5 ${mutedTextClass}`}
            style={{ maxWidth: MAX_CONTENT_WIDTH }}>
            By continuing you agree to our{" "}
            <Text
              className={`${accentTextClass} font-semibold`}
              onPress={() => router.push("/terms")}>
              Terms & Conditions
            </Text>{" "}
            and{" "}
            <Text
              className={`${accentTextClass} font-semibold`}
              onPress={() => router.push("/privacy-policy")}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        <Text className={`mb-6 text-center text-xs ${mutedTextClass}`}>
          Track · Discover · Wear
        </Text>
      </SafeAreaView>
    </View>
  )
}
