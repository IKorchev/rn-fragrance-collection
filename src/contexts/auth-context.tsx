import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
  type ReactNode,
} from "react"
import * as Google from "expo-auth-session/providers/google"
import * as AppleAuthentication from "expo-apple-authentication"
import * as Haptics from "expo-haptics"
import * as Notifications from "expo-notifications"
import * as WebBrowser from "expo-web-browser"
import { router, usePathname } from "expo-router"
import { Alert, Platform } from "react-native"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"
import Purchases, { type CustomerInfo } from "react-native-purchases"

import { supabase } from "@/lib/supabase"
import {
  registerForPushNotificationsAsync,
  WEAR_REMINDER_ACTIONS,
  WEAR_REMINDER_CATEGORY,
} from "@/lib/notifications"
import { pickWeightedIndex } from "@/lib/utils/pick-weighted-index"
import { deviceTimeZone } from "@/lib/utils/worn-today"
import {
  purchasesEnabled,
  configurePurchases,
  identifyPurchaser,
  resetPurchaser,
  isProFromCustomerInfo,
} from "@/lib/purchases"
import { FREE_COLLECTION_LIMIT, isFreeTierLimitError, promptProUpsell } from "@/lib/entitlements"
import {
  EMPTY_PICKER_FILTERS,
  applyPickerFilters,
  pickerFiltersActive,
  type PickerFilters,
} from "@/lib/utils/picker-filters"
import useToast from "@/contexts/toast-context"
import type { ReportReason } from "@/lib/queries"
import { reportError } from "@/lib/sentry"
import type { Tables } from "@/lib/database.types"

WebBrowser.maybeCompleteAuthSession()

export type UserFragrance = Tables<"user_fragrances">

export type AppUser = User & { photoURL?: string }

// What the add/delete/edit flows pass around — a full row for collection
// items, or just name/image for items coming from search/top-100/catalog.
export interface FragranceInput {
  id?: string
  name: string
  image_url: string | null
  // Catalog fragrances.id FK — set when the item was added from catalog search
  fragrance_id?: string | null
}

interface AuthContextValue {
  user: AppUser | null
  authLoading: boolean
  // Set when the initial supabase.auth.getSession() check itself fails (e.g.
  // corrupt AsyncStorage, not just "no session") — lets the root layout show
  // a recovery screen instead of hanging or silently falling to sign-in.
  authError: Error | null
  retryAuthInit: () => void
  signInWithGoogle: () => void
  signInWithApple: () => Promise<void>
  logOut: () => void
  // Deletes the auth user (and all their rows, via FK cascade) through the
  // delete-account edge function. Throws on failure — callers own the confirm
  // dialog and error alert.
  deleteAccount: () => Promise<void>
  incrementWear: (object: { id: string }) => Promise<void>
  requestDelete: (object: { id: string }) => void
  cancelDelete: (id: string) => void
  updateFragrance: (
    object: { id: string },
    updates: Partial<Pick<UserFragrance, "name" | "image_url" | "rating" | "notes" | "tags">>
  ) => Promise<boolean>
  // Community rating for a catalog-linked fragrance (fragrance_ratings table,
  // separate from the manual-add-only rating column on updateFragrance above).
  // null clears the caller's rating (tap-to-clear on the detail sheet).
  rateFragrance: (fragranceId: string, rating: number | null) => Promise<void>
  addFragranceToCollection: (object: FragranceInput) => Promise<void>
  // Manual (non-catalog) add: one RPC inserts the collection row and queues
  // the catalog suggestion in the same transaction (fragrance_submissions —
  // pending until a moderator approves; see add_manual_fragrance /
  // review_submission in db/schema.sql). The suggestion half is best-effort
  // server-side and can never fail the add.
  addManualFragrance: (input: { brand: string; title: string }) => Promise<void>
  // Moderator decision on a pending suggestion (src/app/moderation.tsx).
  // review_submission itself re-checks moderators-table membership — this is
  // just the client wrapper, not the authorization boundary.
  reviewSubmission: (input: {
    id: string
    action: "approve" | "merge" | "reject"
    mergeTarget?: string
    note?: string
  }) => Promise<void>
  // Catalog feedback (wrong image / duplicate / incorrect name-brand /
  // other) on an EXISTING catalog row — src/app/report-fragrance.tsx.
  // Separate from addManualFragrance/submit_fragrance_suggestion, which
  // propose NEW rows. Idempotent server-side (re-reporting the same reason
  // just returns the existing pending report). Throws on failure — the
  // caller owns the error UI (same convention as deleteAccount above).
  reportFragrance: (input: {
    fragranceId: string
    reason: ReportReason
    details?: string
  }) => Promise<void>
  // Moderator decision on a pending catalog-issue report
  // (src/app/moderation.tsx's Reports tab). review_fragrance_report itself
  // re-checks moderators-table membership — this is just the client wrapper.
  reviewFragranceReport: (input: {
    id: string
    action: "resolve" | "dismiss"
    note?: string
  }) => Promise<void>
  // Pro-tier entitlement — sourced from RevenueCat's local CustomerInfo cache
  // (instant, no network round-trip); always false when purchases aren't
  // configured (see src/lib/purchases.ts).
  isPro: boolean
  userCollection: UserFragrance[]
  sortedCollection: UserFragrance[]
  visibleSortedCollection: UserFragrance[]
  // Initial-load / failure state of the collection query, so screens can
  // show a spinner or retry UI instead of a misleading "empty" state
  collectionPending: boolean
  collectionError: boolean
  refetchCollection: () => Promise<unknown>
  frag: UserFragrance | undefined
  setFrag: React.Dispatch<React.SetStateAction<UserFragrance | undefined>>
  getNewFrag: (targetIndex?: number) => void
  index: number | undefined
  // Picker filtering (Pro — see src/lib/entitlements.ts). pickerPool is
  // userCollection narrowed by the active filters (or unfiltered when not
  // Pro) — same base collection getNewFrag always drew from, just optionally
  // narrowed; getNewFrag/index/frag above operate over this pool, so
  // weighting always runs over the filtered set.
  pickerPool: UserFragrance[]
  pickerFilters: PickerFilters
  setPickerFilters: (filters: PickerFilters) => void
  pickerHasActiveFilters: boolean
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

const useAuth = () => {
  return useContext(AuthContext)
}

// Supabase stores the Google avatar in user_metadata; expose it as photoURL so
// consumers keep the same shape they had with Firebase (see Header.tsx).
const toAppUser = (sessionUser: User | null | undefined): AppUser | null =>
  sessionUser ? { ...sessionUser, photoURL: sessionUser.user_metadata?.avatar_url } : null

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<Error | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const deleteTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // The currently "picked" fragrance + its index in pickerPool
  const [frag, setFrag] = useState<UserFragrance | undefined>()
  const [index, setIndex] = useState<number | undefined>()
  const [pickerFiltersState, setPickerFiltersState] = useState<PickerFilters>(EMPTY_PICKER_FILTERS)

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  // Pulled out of the effect (and memoized) so the root layout can offer a
  // manual retry if this genuinely fails or stalls (see StartupRecovery).
  const loadSession = useCallback(() => {
    setAuthLoading(true)
    setAuthError(null)
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        // getSession() resolves (rather than rejects) with `error` set for
        // things like a stale/invalid refresh token — thrown here so the
        // shared .catch() below treats it the same as an outright rejection
        // instead of silently falling through to a "signed-out" user: null.
        if (error) throw error
        setUser(toAppUser(data.session?.user))
        setAuthLoading(false)
      })
      .catch((error) => {
        // Previously unhandled — a rejection here (e.g. corrupt AsyncStorage)
        // left authLoading stuck true forever, hanging the app on a blank
        // screen with no way to recover short of a reinstall.
        reportError(error)
        setAuthError(error instanceof Error ? error : new Error("Failed to restore session"))
        setAuthLoading(false)
      })
  }, [])

  useEffect(() => {
    loadSession()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user))
      setAuthLoading(false)
      setAuthError(null)
    })
    return () => subscription.unsubscribe()
  }, [loadSession])

  // Configure once as early as possible (RevenueCat's own recommendation);
  // no-ops if EXPO_PUBLIC_REVENUECAT_*_API_KEY isn't set.
  useEffect(() => {
    configurePurchases()
  }, [])

  // CustomerInfo is the client-side source of truth for UI gating — instant,
  // no network round-trip. The `subscriptions` table (synced by the
  // revenuecat-webhook edge function) is only for server-side enforcement.
  useEffect(() => {
    if (!purchasesEnabled) return
    const listener = (info: CustomerInfo) => setIsPro(isProFromCustomerInfo(info))
    Purchases.addCustomerInfoUpdateListener(listener)
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
    }
  }, [])

  // Links RevenueCat's app_user_id to the Supabase user id so the webhook
  // can attribute purchases to the right row in `subscriptions`.
  useEffect(() => {
    if (!purchasesEnabled || !user?.id) return
    identifyPurchaser(user.id)
      .then((result) => {
        if (result) setIsPro(isProFromCustomerInfo(result.customerInfo))
      })
      .catch(reportError)
  }, [user?.id])

  const {
    data: collectionData,
    refetch: refetchCollection,
    isPending: collectionPending,
    isError: collectionError,
  } = useQuery({
    queryKey: ["collection", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserFragrance[]> => {
      const { data, error } = await supabase
        .from("user_fragrances")
        .select("*")
        .eq("user_id", user!.id)
      if (error) throw error
      return data ?? []
    },
  })
  const userCollection = collectionData ?? []
  const sortedCollection = [...userCollection].sort((el1, el2) => el1.times_worn - el2.times_worn)

  // Free users' filters are ignored even if some were set before a downgrade
  // — the picker always sees the whole collection when not Pro.
  const activePickerFilters = isPro ? pickerFiltersState : EMPTY_PICKER_FILTERS
  const pickerPool = applyPickerFilters(userCollection, activePickerFilters)

  const invalidateCollection = () =>
    queryClient.invalidateQueries({ queryKey: ["collection", user?.id] })
  const invalidateRecommendations = () =>
    queryClient.invalidateQueries({ queryKey: ["recommendations", user?.id] })
  const invalidateCollectionAndRecommendations = () =>
    Promise.all([invalidateCollection(), invalidateRecommendations()])

  // Realtime keeps other devices in sync; local writes also invalidate directly
  // so the UI never depends on the channel being up.
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`user_fragrances:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_fragrances", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["collection", user.id] })
          queryClient.invalidateQueries({ queryKey: ["recommendations", user.id] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Register this device for push and remember its Expo token. Upserting on
  // the token re-homes it if a different account signs in on the same device.
  useEffect(() => {
    if (!user?.id) return
    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return
      const { error } = await supabase
        .from("user_push_tokens")
        .upsert(
          {
            user_id: user.id,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        )
      if (error) reportError(error, { rpc: "save-push-token" })
    })
  }, [user?.id])

  // Operates over pickerPool (userCollection narrowed by the active picker
  // filters), not the raw collection — filtering only shrinks the candidate
  // set, so pickWeightedIndex's weighting math is unchanged.
  const getNewFrag = (targetIndex?: number) => {
    const max = pickerPool.length - 1
    let nextIndex = targetIndex

    if (typeof nextIndex !== "number" || nextIndex < 0 || nextIndex > max) {
      nextIndex = pickWeightedIndex(pickerPool)
    }

    setFrag(nextIndex >= 0 ? pickerPool[nextIndex] : undefined)
    setIndex(nextIndex >= 0 ? nextIndex : undefined)
  }

  useEffect(() => {
    if (pickerPool.length >= 1) {
      getNewFrag()
    } else {
      setFrag(undefined)
      setIndex(undefined)
    }
  }, [pickerPool.length])

  // Updates the filters and immediately re-picks from the new pool — waiting
  // for the mount effect above to notice would race pickerPool.length staying
  // the same across a filter change (e.g. swapping one tag for another).
  const setPickerFilters = (filters: PickerFilters) => {
    setPickerFiltersState(filters)
    const nextPool = applyPickerFilters(userCollection, isPro ? filters : EMPTY_PICKER_FILTERS)
    const nextIndex = nextPool.length ? pickWeightedIndex(nextPool) : -1
    setFrag(nextIndex >= 0 ? nextPool[nextIndex] : undefined)
    setIndex(nextIndex >= 0 ? nextIndex : undefined)
  }

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params
      supabase.auth
        .signInWithIdToken({ provider: "google", token: id_token, access_token })
        .then(({ error }) => {
          if (error) {
            reportError(error, { flow: "google-sign-in" })
            Alert.alert("Sign in failed", "Something went wrong, please try again.")
          }
        })
    }
  }, [response])

  const addFragranceToCollection = async (object: FragranceInput) => {
    if (object.name.length < 3) {
      showToast({ message: "The name must be 3 or more characters" })
      return
    }
    if (userCollection.find((el) => el.name === object.name)) {
      showToast({ message: `You already have ${object.name} in your collection` })
      return
    }

    try {
      const { error } = await supabase.from("user_fragrances").insert({
        user_id: user!.id,
        name: object.name,
        image_url: object.image_url,
        fragrance_id: object.fragrance_id ?? null,
        times_worn: 0,
      })
      if (error) throw error
      await invalidateCollectionAndRecommendations()
      showToast({ message: `${object.name} added to your collection` })
    } catch (error) {
      if (isFreeTierLimitError(error)) {
        reportError(error, { flow: "add-to-collection" })
        if (isPro) {
          showToast({ message: "Your Pro access is syncing. Please try adding it again in a moment." })
          return
        }
        promptProUpsell(
          "Collection limit reached",
          `Free accounts can track up to ${FREE_COLLECTION_LIMIT} fragrances. Upgrade to Pro for unlimited tracking.`
        )
        return
      }
      showToast({ message: "Couldn't add that fragrance, please try again later" })
      reportError(error, { flow: "add-to-collection" })
    }
  }

  const addManualFragrance = async (input: { brand: string; title: string }) => {
    const name = `${input.brand} - ${input.title}`
    if (userCollection.find((el) => el.name === name)) {
      showToast({ message: `You already have ${name} in your collection` })
      return
    }
    try {
      const { error } = await supabase.rpc("add_manual_fragrance", {
        p_brand: input.brand,
        p_title: input.title,
      })
      if (error) throw error
      await invalidateCollectionAndRecommendations()
      showToast({ message: `${name} added to your collection` })
    } catch (error) {
      if (isFreeTierLimitError(error)) {
        reportError(error, { flow: "add-manual-fragrance" })
        if (isPro) {
          showToast({ message: "Your Pro access is syncing. Please try adding it again in a moment." })
          return
        }
        promptProUpsell(
          "Collection limit reached",
          `Free accounts can track up to ${FREE_COLLECTION_LIMIT} fragrances. Upgrade to Pro for unlimited tracking.`
        )
        return
      }
      showToast({ message: "Couldn't add that fragrance, please try again later" })
      reportError(error, { flow: "add-manual-fragrance" })
    }
  }

  const reviewSubmission = async (input: {
    id: string
    action: "approve" | "merge" | "reject"
    mergeTarget?: string
    note?: string
  }) => {
    try {
      const { error } = await supabase.rpc("review_submission", {
        p_submission_id: input.id,
        p_action: input.action,
        p_merge_target: input.mergeTarget,
        p_note: input.note,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] })
    } catch (error) {
      Alert.alert("Review failed", "Something went wrong, please try again later.")
      reportError(error, { flow: "review-submission" })
    }
  }

  const reportFragrance = async (input: {
    fragranceId: string
    reason: ReportReason
    details?: string
  }) => {
    const { error } = await supabase.rpc("submit_fragrance_report", {
      p_fragrance_id: input.fragranceId,
      p_reason: input.reason,
      p_details: input.details,
    })
    if (error) throw error
  }

  const reviewFragranceReport = async (input: {
    id: string
    action: "resolve" | "dismiss"
    note?: string
  }) => {
    try {
      const { error } = await supabase.rpc("review_fragrance_report", {
        p_report_id: input.id,
        p_action: input.action,
        p_note: input.note,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ["pending-reports"] })
    } catch (error) {
      Alert.alert("Review failed", "Something went wrong, please try again later.")
      reportError(error, { flow: "review-fragrance-report" })
    }
  }

  const performDelete = async (object: { id: string }) => {
    try {
      const { error } = await supabase.from("user_fragrances").delete().eq("id", object.id)
      if (error) throw error
      await invalidateCollectionAndRecommendations()
    } catch (err) {
      Alert.alert("Delete failed", "Something went wrong, please try again later.")
      reportError(err, { flow: "delete-fragrance" })
    }
  }

  // Deletion is deferred so the caller can show an "Undo" toast — the database
  // delete only actually happens once the timeout fires without cancelDelete().
  const requestDelete = (object: { id: string }) => {
    setPendingDeleteIds((prev) => (prev.includes(object.id) ? prev : [...prev, object.id]))
    deleteTimeouts.current[object.id] = setTimeout(async () => {
      delete deleteTimeouts.current[object.id]
      // Keep the row hidden until the delete lands and the refetch drops it —
      // un-hiding first made it flash back in during the network round-trip.
      // (On failure the row correctly reappears, since it wasn't deleted.)
      await performDelete(object)
      setPendingDeleteIds((prev) => prev.filter((id) => id !== object.id))
    }, 4000)
  }

  const cancelDelete = (id: string) => {
    clearTimeout(deleteTimeouts.current[id])
    delete deleteTimeouts.current[id]
    setPendingDeleteIds((prev) => prev.filter((pid) => pid !== id))
  }

  const updateFragrance = async (
    object: { id: string },
    updates: Partial<Pick<UserFragrance, "name" | "image_url" | "rating" | "notes" | "tags">>
  ) => {
    try {
      const { error } = await supabase.from("user_fragrances").update(updates).eq("id", object.id)
      if (error) throw error
      await invalidateCollection()
      if ("name" in updates || "rating" in updates) await invalidateRecommendations()
      return true
    } catch (error) {
      Alert.alert("Update failed", "Something went wrong, please try again later.")
      // Only the error is reported — never `updates` itself, which can carry
      // user-entered notes/rating (see CLAUDE.md on personal per-item content).
      reportError(error, { flow: "update-fragrance" })
      return false
    }
  }

  const rateFragrance = async (fragranceId: string, rating: number | null) => {
    try {
      if (rating === null) {
        const { error } = await supabase
          .from("fragrance_ratings")
          .delete()
          .eq("user_id", user!.id)
          .eq("fragrance_id", fragranceId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("fragrance_ratings").upsert(
          {
            user_id: user!.id,
            fragrance_id: fragranceId,
            rating,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,fragrance_id" }
        )
        if (error) throw error
      }
      queryClient.invalidateQueries({ queryKey: ["my-rating", user?.id, fragranceId] })
      queryClient.invalidateQueries({ queryKey: ["fragrance-ratings"] })
      queryClient.invalidateQueries({ queryKey: ["recommendations", user?.id] })
    } catch (error) {
      Alert.alert("Update failed", "Something went wrong, please try again later.")
      reportError(error, { flow: "rate-fragrance" })
    }
  }

  const invalidateWearQueries = async () => {
    await invalidateCollectionAndRecommendations()
    // increment_wear/undo_wear also touch wear_events — refresh the
    // leaderboard and the personal wear-history diary
    queryClient.invalidateQueries({ queryKey: ["top-worn"] })
    queryClient.invalidateQueries({ queryKey: ["wear-history"] })
  }

  // Reverses today's wear (mistap protection — see the Undo toast below).
  const undoWear = async (object: { id: string }) => {
    try {
      const { data: undone, error } = await supabase.rpc("undo_wear", {
        row_id: object.id,
        tz: deviceTimeZone,
      })
      if (error) throw error
      if (undone) await invalidateWearQueries()
    } catch (error) {
      Alert.alert("Oops", "Couldn't undo that wear.")
      reportError(error, { flow: "undo-wear" })
    }
  }

  const incrementWear = async (object: { id: string }) => {
    // Immediate tactile ack on tap — the RPC round-trip lands later
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const title = userCollection
      .find((el) => el.id === object.id)
      ?.name.split(" - ")
      .slice(1)
      .join(" - ")
    try {
      // Returns false when the fragrance was already worn today (one wear per
      // calendar day, in the device's timezone)
      const { data: counted, error } = await supabase.rpc("increment_wear", {
        row_id: object.id,
        tz: deviceTimeZone,
      })
      if (error) throw error
      if (!counted) {
        showToast({ message: `${title ?? "This one"} was already worn today` })
        return
      }
      await invalidateWearQueries()
      // A mistap would otherwise cost the whole day (one wear per calendar
      // day) and permanently skew stats — always offer a short undo window.
      showToast({
        message: `Scent logged for ${title ?? "today"}`,
        actionLabel: "Undo",
        onAction: () => undoWear(object),
      })
    } catch (error) {
      Alert.alert("Oops", `Something went wrong!`)
      reportError(error, { flow: "increment-wear" })
    }
  }

  // Wear-reminder push actions (categories in src/lib/notifications.ts,
  // payload from the send-wear-reminder edge function). Held until user +
  // collection are ready — the wear RPC needs the session; the ref stops
  // re-handling the same response when deps change.
  const reminderResponse = Notifications.useLastNotificationResponse()
  const handledReminderKey = useRef<string | null>(null)
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  // A router.push issued while the activity is still resuming from the
  // notification tap is dropped silently — push immediately (instant in the
  // common case) and retry until the route actually changes
  const openPickerFromReminder = () => {
    let attempts = 0
    const tryPush = () => {
      if (pathnameRef.current === "/picker" || attempts >= 8) return
      attempts++
      router.push("/picker")
      setTimeout(tryPush, 350)
    }
    tryPush()
  }
  useEffect(() => {
    if (!reminderResponse || !user?.id || collectionPending) return
    const { actionIdentifier, notification } = reminderResponse
    const content = notification.request.content
    if (content.categoryIdentifier !== WEAR_REMINDER_CATEGORY) return
    const key = `${notification.request.identifier}:${actionIdentifier}`
    if (handledReminderKey.current === key) return
    handledReminderKey.current = key

    if (actionIdentifier === WEAR_REMINDER_ACTIONS.wear) {
      const suggestedId = (content.data as Record<string, unknown> | null)?.userFragranceId
      if (typeof suggestedId === "string") incrementWear({ id: suggestedId })
    } else {
      // Body taps and "Open picker" both land on the picker
      openPickerFromReminder()
    }
  }, [reminderResponse, user?.id, collectionPending])

  const signInWithGoogle = () => {
    promptAsync()
  }

  // App Store Guideline 4.8: apps offering Google sign-in must also offer
  // Apple sign-in on iOS. The identity token is exchanged with Supabase the
  // same way as Google's.
  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error("No identityToken returned")
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      })
      if (error) throw error
    } catch (error) {
      // User dismissed the native sheet — not an error
      if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED") return
      reportError(error, { flow: "apple-sign-in" })
      Alert.alert("Sign in failed", "Something went wrong, please try again.")
    }
  }

  const logOut = () => {
    resetPurchaser()
    supabase.auth.signOut()
  }

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST" })
    if (error) throw error
    await resetPurchaser()
    // The server-side session is already gone with the user — local scope
    // avoids a doomed round-trip and clears the stored session.
    await supabase.auth.signOut({ scope: "local" })
  }

  const visibleSortedCollection = sortedCollection.filter(
    (el) => !pendingDeleteIds.includes(el.id)
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authError,
        retryAuthInit: loadSession,
        signInWithGoogle,
        signInWithApple,
        logOut,
        deleteAccount,
        incrementWear,
        requestDelete,
        cancelDelete,
        updateFragrance,
        rateFragrance,
        addFragranceToCollection,
        addManualFragrance,
        reviewSubmission,
        reportFragrance,
        reviewFragranceReport,
        isPro,
        userCollection,
        sortedCollection,
        visibleSortedCollection,
        collectionPending,
        collectionError,
        refetchCollection,
        frag,
        setFrag,
        getNewFrag,
        index,
        pickerPool,
        pickerFilters: activePickerFilters,
        setPickerFilters,
        pickerHasActiveFilters: pickerFiltersActive(activePickerFilters),
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export default useAuth
