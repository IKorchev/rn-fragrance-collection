import { Platform } from "react-native"
import Purchases, { LOG_LEVEL, type CustomerInfo } from "react-native-purchases"
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui"

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
})

// Every export here no-ops when the platform key isn't set (e.g. local dev
// without RevenueCat configured yet) so callers don't need to guard every
// call site.
export const purchasesEnabled = !!apiKey

// Entitlement identifier configured in the RevenueCat dashboard for the Pro
// tier — must match what's attached to the App Store Connect / Play Console
// subscription products there, character for character (an exact-key lookup
// against CustomerInfo.entitlements.active).
export const PRO_ENTITLEMENT_ID = "com.korchev.fragrancecollection Pro"

let configured = false

export const configurePurchases = () => {
  if (!purchasesEnabled || configured) return
  configured = true
  Purchases.configure({ apiKey: apiKey! })
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
}

// Links RevenueCat's app_user_id to the Supabase auth user id — the
// revenuecat-webhook edge function relies on these matching so it upserts
// the right row in `subscriptions`. Call right after Supabase sign-in.
export const identifyPurchaser = (userId: string) =>
  purchasesEnabled ? Purchases.logIn(userId) : Promise.resolve()

export const resetPurchaser = () => (purchasesEnabled ? Purchases.logOut() : Promise.resolve())

export const isProFromCustomerInfo = (info: CustomerInfo) =>
  info.entitlements.active[PRO_ENTITLEMENT_ID] != null

// Presents the paywall configured in the RevenueCat dashboard (Paywall
// Builder) as a native full-screen modal, with its own built-in close
// button — no app route/screen needed. Resolves once the sheet is dismissed.
export const presentPaywall = () =>
  purchasesEnabled ? RevenueCatUI.presentPaywall() : Promise.resolve(PAYWALL_RESULT.NOT_PRESENTED)

export { PAYWALL_RESULT }
