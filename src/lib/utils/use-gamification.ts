import { useMemo } from "react"
import useAuth from "@/contexts/auth-context"
import { useWearSummary, useStreakSaves, useMyRatings } from "@/lib/queries"
import {
  computeGamification,
  wearStatsFromSummary,
  type GamificationState,
  type WearStats,
} from "@/lib/gamification"
import useRatedCollection from "@/lib/utils/use-rated-collection"

// All-time wear stats (totals, worn days, per-name counts) from the uncapped
// wear_summary RPC — empty while it loads, so the header just briefly shows
// 0s rather than gating on a loading flag.
export const useWearStats = (userId: string | undefined): WearStats => {
  const { data: summary } = useWearSummary(userId)
  return useMemo(() => wearStatsFromSummary(summary ?? []), [summary])
}

// Bridges the pure computeGamification() core to the app's live data sources
// (useWearStats + the collection query already owned by AuthContext) so
// screens don't have to wire that up themselves.
// Also wires in Streak Saver's freezeDates (Pro perk — a spent save fills a
// missed day as if worn, see streak_saves in db/schema.sql). Anything that
// needs the user's gamification state should go through this hook rather
// than calling computeGamification directly.
export const useGamification = (): GamificationState => {
  const { user } = useAuth()
  const collection = useRatedCollection()
  const wears = useWearStats(user?.id)
  const { data: streakSaves } = useStreakSaves(user?.id)

  const freezeDates = useMemo(
    () => new Set((streakSaves ?? []).map((row) => new Date(`${row.saved_date}T00:00:00`).toDateString())),
    [streakSaves]
  )

  return useMemo(
    () =>
      computeGamification({
        wears,
        collection,
        streakOptions: { freezeDates },
      }),
    [wears, collection, freezeDates]
  )
}

// True once every input above has loaded. Anything that persists or compares
// gamification state (the badge toast, the public profile sync) must wait for
// it: a snapshot taken mid-load looks like progress was lost, and the real
// values arriving a moment later then read as a fresh badge unlock.
export const useGamificationReady = (): boolean => {
  const { user, collectionPending } = useAuth()
  const { data: summary } = useWearSummary(user?.id)
  const { data: streakSaves } = useStreakSaves(user?.id)
  const { data: myRatings } = useMyRatings(user?.id)
  return (
    !!user &&
    !collectionPending &&
    summary !== undefined &&
    streakSaves !== undefined &&
    myRatings !== undefined
  )
}

export default useGamification
