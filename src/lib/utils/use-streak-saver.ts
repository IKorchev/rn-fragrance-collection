import { useEffect, useRef } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useQueryClient } from "@tanstack/react-query"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import { useWearHistory, useStreakSaves } from "@/lib/queries"
import { computeStreak } from "@/lib/gamification"
import { promptProUpsell, isStreakSaverMonthlyLimitError } from "@/lib/entitlements"
import { toLocalDateString } from "@/lib/utils/worn-today"
import { supabase } from "@/lib/supabase"
import { reportError } from "@/lib/sentry"

const ONE_DAY_MS = 24 * 60 * 60 * 1000
// Below this, "your streak just broke" isn't much of a loss — not worth an
// interruption (auto-save RPC call or upsell prompt) for a 1-2 day streak.
const MIN_STREAK_TO_SAVE = 3

const dateKey = (d: Date) => d.toDateString()
const upsellMarkerKey = (userId: string, breakKey: string) => `streak-saver:upsell-shown:${userId}:${breakKey}`

// Mount once per signed-in session (see (tabs)/_layout.tsx, alongside the
// other gamification alert hooks) so this check runs regardless of which tab
// is active. Detects "streak just broke" on app open: exactly yesterday has
// no wear event, but the day before yesterday does and ends a streak of >=
// MIN_STREAK_TO_SAVE counting backward from it. Pro users get it auto-fixed
// (spends one of their monthly Streak Saver uses on yesterday — see
// use_streak_save in db/schema.sql); free users see the Pro upsell once per
// DISTINCT break (an AsyncStorage marker keyed by the specific missed date,
// not "ever" — a later, different break prompts again).
export const useStreakSaver = () => {
  const { user, isPro } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const userId = user?.id
  const { data: events } = useWearHistory(userId)
  const { data: streakSaves } = useStreakSaves(userId)
  // One attempt per (user, specific missed date) per mount — the RPC/toast
  // itself is idempotent via the `alreadySaved` guard below once the saves
  // query refetches, but this stops a double-fire in the render right after
  // the mutation, before that refetch has landed.
  const attemptedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || !events || !streakSaves) return

    const now = new Date()
    const yesterday = new Date(now.getTime() - ONE_DAY_MS)
    const twoDaysAgo = new Date(now.getTime() - 2 * ONE_DAY_MS)
    const yesterdayKey = dateKey(yesterday)
    const twoDaysAgoKey = dateKey(twoDaysAgo)

    const wornOn = (key: string) => events.some((e) => new Date(e.worn_at).toDateString() === key)
    const alreadySaved = streakSaves.some(
      (row) => new Date(`${row.saved_date}T00:00:00`).toDateString() === yesterdayKey
    )

    // Not the shape of a fresh break: yesterday was already saved (handled),
    // yesterday was actually worn (no break), or the day before yesterday
    // wasn't worn either (the break happened earlier than yesterday, or
    // there was no streak in the first place).
    if (alreadySaved || wornOn(yesterdayKey) || !wornOn(twoDaysAgoKey)) return

    // Streak as it stood on the day before yesterday — the count that just
    // got cut short.
    const priorStreak = computeStreak(events, twoDaysAgo)
    if (priorStreak < MIN_STREAK_TO_SAVE) return

    const attemptKey = `${userId}:${yesterdayKey}`
    if (attemptedRef.current === attemptKey) return
    attemptedRef.current = attemptKey

    if (isPro) {
      ;(async () => {
        try {
          const { data: saved, error } = await supabase.rpc("use_streak_save", {
            p_saved_date: toLocalDateString(yesterday),
          })
          if (error) throw error
          if (!saved) return // already saved server-side (idempotent) or lost a race
          queryClient.invalidateQueries({ queryKey: ["streak-saves", userId] })
          const resultingStreak = computeStreak(events, now, {
            freezeDates: new Set([yesterdayKey]),
          })
          showToast({ message: t("streakSaver.usedToast", { count: resultingStreak }) })
        } catch (error) {
          // Already used both of this month's saves on an earlier break —
          // expected, not worth reporting as an error.
          if (isStreakSaverMonthlyLimitError(error)) return
          reportError(error, { flow: "streak-saver-auto-save" })
        }
      })()
    } else {
      AsyncStorage.getItem(upsellMarkerKey(userId, yesterdayKey)).then((shown) => {
        if (shown) return
        AsyncStorage.setItem(upsellMarkerKey(userId, yesterdayKey), "1")
        promptProUpsell(
          t("streakSaver.upsellTitle"),
          t("streakSaver.upsellMessage", { count: priorStreak })
        )
      })
    }
  }, [userId, isPro, events, streakSaves, queryClient, showToast, t])
}

export default useStreakSaver
