import "react-native-gesture-handler"
import "../global.css"
import { useEffect } from "react"
import { TouchableWithoutFeedback, Keyboard } from "react-native"
import * as Sentry from "@sentry/react-native"
import * as SplashScreen from "expo-splash-screen"
import { initializeAds } from "@/lib/ads"
import { Stack } from "expo-router"
import { getHeaderTitle } from "expo-router/react-navigation"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { AuthProvider } from "@/contexts/auth-context"
import useAuth from "@/contexts/auth-context"
import { ThemeContextProvider } from "@/contexts/theme-context"
import { ToastContextProvider } from "@/contexts/toast-context"
import { LocaleContextProvider } from "@/contexts/locale-context"
import useLocale from "@/contexts/locale-context"
import { useAppUpdates } from "@/lib/utils/use-app-updates"
import { useStartupReadiness } from "@/lib/utils/use-startup-readiness"
import { initSentry, sentryEnabled } from "@/lib/sentry"
import Header from "@/components/header"
import AppCrashFallback from "@/components/app-crash-fallback"
import StartupRecovery from "@/components/startup-recovery"

initSentry()

// Keep the native splash up until fonts + the initial auth check resolve —
// hidden explicitly by useStartupReadiness. Without this, expo-splash-screen
// auto-hides on first frame, revealing the blank `return null` render while
// still loading (see the `ready` gate below).
SplashScreen.preventAutoHideAsync().catch(() => {})

function RootLayout() {
  return (
    <Sentry.ErrorBoundary fallback={(props) => <AppCrashFallback {...props} />}>
      <QueryClientProvider client={queryClient}>
        <ToastContextProvider>
          <AuthProvider>
            <ThemeContextProvider>
              <LocaleContextProvider>
                <RootNavigator />
              </LocaleContextProvider>
            </ThemeContextProvider>
          </AuthProvider>
        </ToastContextProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  )
}

export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout

function RootNavigator() {
  const { user } = useAuth()
  const { t } = useLocale()
  const { ready, needsRecovery, retrying, retry } = useStartupReadiness()

  // Runs regardless of auth state — an OTA fix shouldn't wait on sign-in
  useAppUpdates()
  // Gathers UMP consent (form shown only where required), then starts the
  // AdMob SDK and preloads the post-picker interstitial. After mount on
  // purpose: the consent form needs the Activity, and ads shouldn't compete
  // with first render anyway. No-ops when ads are disabled (src/lib/ads.ts).
  useEffect(() => {
    initializeAds()
  }, [])

  if (!ready) {
    if (needsRecovery) {
      return <StartupRecovery retrying={retrying} onRetry={retry} />
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
            name="monthly-recap"
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
              title: t("screens.wearHistory"),
              header: ({ navigation, route, options, back }) => (
                <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
              ),
            }}
          />
          <Stack.Screen
            name="badges"
            options={{
              title: t("screens.badges"),
              header: ({ navigation, route, options, back }) => (
                <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
              ),
            }}
          />
          <Stack.Screen
            name="user-profile"
            options={{
              title: t("screens.userProfile"),
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
          <Stack.Screen
            name="report-fragrance"
            options={{
              headerShown: false,
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetAllowedDetents: [0.65, 1],
            }}
          />
          <Stack.Screen
            name="export-data"
            options={{
              headerShown: false,
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetAllowedDetents: [0.75, 1],
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
            title: t("screens.privacyPolicy"),
            header: ({ navigation, route, options, back }) => (
              <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
            ),
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            title: t("screens.terms"),
            header: ({ navigation, route, options, back }) => (
              <Header title={getHeaderTitle(options, route.name)} navigation={navigation} back={back} />
            ),
          }}
        />
      </Stack>
    </TouchableWithoutFeedback>
  )
}
