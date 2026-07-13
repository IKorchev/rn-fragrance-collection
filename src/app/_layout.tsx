import "react-native-gesture-handler"
import "../global.css"
import { useEffect } from "react"
import { LogBox, TouchableWithoutFeedback, Keyboard } from "react-native"
LogBox.ignoreAllLogs()
import * as Sentry from "@sentry/react-native"
import { initializeAds } from "@/lib/ads"
import { Stack } from "expo-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/contexts/auth-context"
import useAuth from "@/contexts/auth-context"
import { ThemeContextProvider } from "@/contexts/theme-context"
import { ToastContextProvider } from "@/contexts/toast-context"
import { useAppUpdates } from "@/lib/utils/use-app-updates"

// Crash reporting — inert until EXPO_PUBLIC_SENTRY_DSN is set in .env.
// (Re-add the "@sentry/react-native/expo" config plugin with org/project once
// a Sentry account exists, to get source-map upload on EAS builds.)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, sendDefaultPii: false })
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContextProvider>
        <AuthProvider>
          <ThemeContextProvider>
            <RootNavigator />
          </ThemeContextProvider>
        </AuthProvider>
      </ToastContextProvider>
    </QueryClientProvider>
  )
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout

function RootNavigator() {
  const { user, authLoading } = useAuth()
  // Runs regardless of auth state — an OTA fix shouldn't wait on sign-in
  useAppUpdates()
  // Gathers UMP consent (form shown only where required), then starts the
  // AdMob SDK and preloads the post-picker interstitial. After mount on
  // purpose: the consent form needs the Activity, and ads shouldn't compete
  // with first render anyway. No-ops when ads are disabled (src/lib/ads.ts).
  useEffect(() => {
    initializeAds()
  }, [])
  if (authLoading) return null

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <Stack>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="picker"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="fragrance-detail"
            options={{
              headerShown: false,
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetAllowedDetents: [0.5, 1],
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetAllowedDetents: [0.65, 1],
            }}
          />
          <Stack.Screen
            name="wear-history"
            options={{
              headerShown: false,
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetAllowedDetents: [0.5, 1],
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Outside both guards — the sign-in screen links here too */}
        <Stack.Screen
          name="privacy-policy"
          options={{
            headerShown: false,
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            sheetAllowedDetents: [0.75, 1],
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            headerShown: false,
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            sheetAllowedDetents: [0.75, 1],
          }}
        />
      </Stack>
    </TouchableWithoutFeedback>
  )
}
