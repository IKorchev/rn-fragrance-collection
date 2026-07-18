import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { Platform } from "react-native"
import { reportError } from "@/lib/sentry"

// Show notifications (banner + list) even while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// Action buttons on the daily wear reminder — the send-wear-reminder edge
// function stamps this categoryId + a suggested userFragranceId in data.
// Android only applies category changes after an app restart.
export const WEAR_REMINDER_CATEGORY = "wear-reminder"
export const WEAR_REMINDER_ACTIONS = {
  wear: "wear-now",
  openPicker: "open-picker",
} as const

if (Platform.OS !== "web") {
  // Both actions open the app — the wear RPC needs the signed-in session
  Notifications.setNotificationCategoryAsync(WEAR_REMINDER_CATEGORY, [
    { identifier: WEAR_REMINDER_ACTIONS.wear, buttonTitle: "Wear it" },
    { identifier: WEAR_REMINDER_ACTIONS.openPicker, buttonTitle: "Open picker" },
  ]).catch((error) => reportError(error, { flow: "register-notification-category" }))
}

// Asks for permission and returns the Expo push token, or null when push
// isn't available (simulator, permission denied, or no EAS projectId yet —
// `eas init` writes extra.eas.projectId into app.json).
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== "granted") return null

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) {
    console.log("No EAS projectId configured — run `eas init` first")
    return null
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId })
    return token.data
  } catch (error) {
    reportError(error, { flow: "get-push-token" })
    return null
  }
}
