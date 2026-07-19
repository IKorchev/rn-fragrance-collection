import { useEffect, useRef } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import { useWearHistory } from "@/lib/queries"
import { isInRange, monthRangeForKey, previousMonthKey } from "./recap-month"

const promptedKey = (userId: string, monthKey: string) => `recap:prompted:${userId}:${monthKey}`

// Only offer the recap in the first week of a new month — past that window
// last month is stale news, not a "your recap is ready" moment.
const PROMPT_WINDOW_DAYS = 7

// Mount once on the Profile screen (same "fire at most once, AsyncStorage
// per-user marker" shape as use-onboarding.ts / use-gamification-alerts.ts).
// Marks the month as "prompted" the moment the toast is shown — regardless
// of whether the user taps View or lets it dismiss — so this can never nag
// twice for the same month.
export const useMonthlyRecapPrompt = () => {
  const { user } = useAuth()
  const { data: events } = useWearHistory(user?.id)
  const { showToast } = useToast()
  const { t, formatDate } = useLocale()
  const router = useRouter()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const userId = user?.id
    if (!userId || !events) return

    const now = new Date()
    if (now.getDate() > PROMPT_WINDOW_DAYS) return

    const monthKey = previousMonthKey(now)
    const range = monthRangeForKey(monthKey)
    const hadWears = events.some((e) => isInRange(e.worn_at, range))
    if (!hadWears) return

    let cancelled = false
    AsyncStorage.getItem(promptedKey(userId, monthKey)).then((seen) => {
      if (cancelled || seen === "1" || firedRef.current) return
      firedRef.current = true
      AsyncStorage.setItem(promptedKey(userId, monthKey), "1")

      const monthLabel = formatDate(range.start, { month: "long" })
      showToast({
        message: t("recap.promptToast", { month: monthLabel }),
        actionLabel: t("recap.promptAction"),
        onAction: () => router.push({ pathname: "/monthly-recap", params: { month: monthKey } }),
      })
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, events, showToast, t, formatDate, router])
}

export default useMonthlyRecapPrompt
