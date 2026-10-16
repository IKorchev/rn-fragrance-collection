import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { Alert, Platform } from "react-native"
import { supabase } from "@/lib/supabase"
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

const pushSupported = Platform.OS !== "web" && Device.isDevice

const ensureAndroidChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
}

export interface NotificationPermission {
  granted: boolean
  canAskAgain: boolean
}

export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!pushSupported) return { granted: false, canAskAgain: false }
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync()
  return { granted, canAskAgain }
}

// Shows the OS prompt. iOS only ever shows it once, so this runs only from an
// explicit user action (the Profile toggle) or the post-first-wear offer
// below — never on launch.
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!pushSupported) return false
  await ensureAndroidChannel()
  const { granted } = await Notifications.requestPermissionsAsync()
  return granted
}

// Saves this device's Expo push token for the user if permission is already
// granted — never prompts. Upserting on the token re-homes it if a different
// account signs in on the same device. Needs extra.eas.projectId in app.json
// (Expo's push service keys tokens by it).
export const syncPushToken = async (userId: string): Promise<boolean> => {
  if (!pushSupported) return false
  try {
    const { granted } = await Notifications.getPermissionsAsync()
    if (!granted) return false
    await ensureAndroidChannel()
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) {
      console.log("No EAS projectId configured — run `eas init` first")
      return false
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    const { error } = await supabase
      .from("user_push_tokens")
      .upsert(
        { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
        { onConflict: "token" }
      )
    if (error) throw error
    return true
  } catch (error) {
    reportError(error, { flow: "save-push-token" })
    return false
  }
}

export type EnableRemindersResult = "enabled" | "blocked" | "failed"

// The Profile toggle's "on" path. "blocked" means permission was denied and
// can no longer be requested in-app — only the OS Settings app can change it.
export const enableDailyReminders = async (userId: string): Promise<EnableRemindersResult> => {
  if (!pushSupported) return "failed"
  let { granted, canAskAgain } = await getNotificationPermission()
  if (!granted && canAskAgain) granted = await requestNotificationPermission()
  if (!granted) return "blocked"
  return (await syncPushToken(userId)) ? "enabled" : "failed"
}

const offeredKey = (userId: string) => `reminders:offered:${userId}`

// Asked once, right after the first logged wear (when a daily nudge plainly
// makes sense), behind an explainer so the one-shot OS prompt isn't spent on
// someone who'd say no. "Not now" leaves the Profile toggle as the way in.
export const offerDailyReminderOnce = async (userId: string, onEnabled: () => void) => {
  if (!pushSupported) return
  try {
    if (await AsyncStorage.getItem(offeredKey(userId))) return
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== "undetermined") return
    await AsyncStorage.setItem(offeredKey(userId), "1")
  } catch (error) {
    reportError(error, { flow: "offer-daily-reminder" })
    return
  }
  // Wait out the 4s "Scent logged · Undo" toast so the dialog never hides the
  // undo for a mistapped first wear
  await new Promise((resolve) => setTimeout(resolve, 4500))
  Alert.alert(
    "Get a daily reminder?",
    "Whiff can nudge you once a day to pick today's scent. You can turn it off any time in Profile.",
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Turn on",
        onPress: async () => {
          if ((await requestNotificationPermission()) && (await syncPushToken(userId))) onEnabled()
        },
      },
    ]
  )
}
