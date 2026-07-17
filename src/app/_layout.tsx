import "react-native-gesture-handler"
import "../global.css"
import { useEffect, useState } from "react"
import { TouchableWithoutFeedback, Keyboard } from "react-native"
import * as Sentry from "@sentry/react-native"
import * as SplashScreen from "expo-splash-screen"
import { useFonts, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces"
import { initializeAds } from "@/lib/ads"
import { Stack } from "expo-router"
import { getHeaderTitle } from "expo-router/react-navigation"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/contexts/auth-context"
import useAuth from "@/contexts/auth-context"
import { ThemeContextProvider } from "@/contexts/theme-context"
import { ToastContextProvider } from "@/contexts/toast-context"
import { useAppUpdates } from "@/lib/utils/use-app-updates"
import { initSentry, sentryEnabled, reportError } from "@/lib/sentry"
import Header from "@/components/header"
import AppCrashFallback from "@/components/app-crash-fallback"
import StartupRecovery from "@/components/startup-recovery"

initSentry()

// Keep the native splash up until fonts + the initial auth check resolve —
// hidden explicitly in RootNavigator below. Without this, expo-splash-screen
// auto-hides on first frame, revealing the blank `return null` render while
// still loading (see RootNavigator's `ready` gate).
SplashScreen.preventAutoHideAsync().catch(() => {})

// How long to wait before treating startup as genuinely stalled (vs. a
// normal cold-start delay) and offering a manual retry.
const STARTUP_STALL_MS = 8000

function RootLayout() {
  return (
    <Sentry.ErrorBoundary fallback={(props) => <AppCrashFallback {...props} />}>
      <QueryClientProvider client={queryClient}>
        <ToastContextProvider>
          <AuthProvider>
            <ThemeContextProvider>
              <RootNavigator />
            </ThemeContextProvider>
          </AuthProvider>
        </ToastContextProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  )
}

export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout

function RootNavigator() {
  const { user, authLoading, authError, retryAuthInit } = useAuth()
  // Display font for screen titles (tailwind's font-display). A load failure
  // (fontError) shouldn't block the whole app forever — fall through to the
  // system font instead of hanging on a blank screen.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold })
  const fontsReady = fontsLoaded || !!fontError
  // authError must gate readiness, not just authLoading — otherwise a
  // resolved-with-error session load (authLoading false, authError set)
  // reads as "ready" and falls straight through to the signed-out stack
  // instead of the recovery screen.
  const ready = !authLoading && fontsReady && !authError
  const [stalled, setStalled] = useState(false)
  // True only while a manual retry is in flight. Reset below whenever
  // authLoading resolves (success or failure) or the retry itself stalls, so
  // a failed/stuck retry always lands back on an actionable Retry button
  // instead of a permanent spinner.
  const [manualRetry, setManualRetry] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  // Runs regardless of auth state — an OTA fix shouldn't wait on sign-in
  useAppUpdates()
  // Gathers UMP consent (form shown only where required), then starts the
  // AdMob SDK and preloads the post-picker interstitial. After mount on
  // purpose: the consent form needs the Activity, and ads shouldn't compete
  // with first render anyway. No-ops when ads are disabled (src/lib/ads.ts).
  useEffect(() => {
    initializeAds()
  }, [])

  useEffect(() => {
    if (fontError) reportError(fontError, { flow: "load-fonts" })
  }, [fontError])

  // Genuine stall (e.g. the initial session check hanging on a bad network) —
  // give up waiting on the native splash and offer a manual retry instead of
  // sitting blank/frozen indefinitely. Keyed on retryToken too so each manual
  // retry gets its own fresh stall window instead of reusing (or never
  // re-arming) the original timer.
  useEffect(() => {
    if (ready) {
      setStalled(false)
      return
    }
    const timer = setTimeout(() => setStalled(true), STARTUP_STALL_MS)
    return () => clearTimeout(timer)
  }, [ready, retryToken])

  // A retry attempt "completes" (success or failure) once authLoading drops —
  // always resolve the spinner back to a normal state at that point.
  useEffect(() => {
    if (!authLoading) setManualRetry(false)
  }, [authLoading])

  // ...and if the retry itself stalls past the window, bail out of the
  // spinner back to an actionable Retry button rather than spinning forever.
  useEffect(() => {
    if (stalled) setManualRetry(false)
  }, [stalled])

  // manualRetry keeps the recovery screen mounted (showing the spinner) for
  // the duration of a retry attempt, even though authError was cleared
  // synchronously when the retry kicked off.
  const needsRecovery = !!authError || stalled || manualRetry

  useEffect(() => {
    if (ready || needsRecovery) SplashScreen.hideAsync().catch(() => {})
  }, [ready, needsRecovery])

  if (!ready) {
    if (needsRecovery) {
      return (
        <StartupRecovery
          retrying={manualRetry}
          onRetry={() => {
            setManualRetry(true)
            setStalled(false)
            setRetryToken((token) => token + 1)
            retryAuthInit()
          }}
        />
      )
    }
    // Still within the normal loading window — the native splash covers this.
    return null
  }

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
            name="wear-history"
            options={{
              title: "Wear History",
              header: ({ navigation, route, options, back }) => (
                <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
              ),
            }}
          />
          <Stack.Screen
            name="moderation"
            options={{
              headerShown: false,
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetAllowedDetents: [0.65, 1],
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
            title: "Privacy Policy",
            header: ({ navigation, route, options, back }) => (
              <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
            ),
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            title: "Terms & Conditions",
            header: ({ navigation, route, options, back }) => (
              <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
            ),
          }}
        />
      </Stack>
    </TouchableWithoutFeedback>
  )
}
