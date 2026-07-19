import { useMemo } from "react"
import useAuth from "@/contexts/auth-context"
import { useWearHistory, useStreakSaves } from "@/lib/queries"
import { computeGamification, totalQuestXp, type GamificationState } from "@/lib/gamification"

// Bridges the pure computeGamification() core to the app's live data sources
// (the personal wear diary + the collection query already owned by
// AuthContext) so screens don't have to wire that up themselves. Events
// default to `[]` while useWearHistory is still loading, same as the old
// inline profile useMemo did — the header just briefly shows 0s rather than
// gating on a loading flag.
//
// Also the single wiring point for the two later gamification workstreams so
// call sites stay clean: quest XP (bonusXp, fully derived — see
// src/lib/gamification/quests.ts) and Streak Saver's freezeDates (Pro perk —
// a spent save fills a missed day as if worn, see streak_saves in
// db/schema.sql). Anything that needs the user's gamification state should
// go through this hook rather than calling computeGamification directly.
export const useGamification = (): GamificationState => {
  const { user, userCollection } = useAuth()
  const { data: events } = useWearHistory(user?.id)
  const { data: streakSaves } = useStreakSaves(user?.id)

  const freezeDates = useMemo(
    () => new Set((streakSaves ?? []).map((row) => new Date(`${row.saved_date}T00:00:00`).toDateString())),
    [streakSaves]
  )

  return useMemo(() => {
    const safeEvents = events ?? []
    return computeGamification({
      events: safeEvents,
      collection: userCollection,
      bonusXp: totalQuestXp(safeEvents, userCollection),
      streakOptions: { freezeDates },
    })
  }, [events, userCollection, freezeDates])
}

export default useGamification
