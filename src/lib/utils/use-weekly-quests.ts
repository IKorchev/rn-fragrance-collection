import { useMemo } from "react"
import useAuth from "@/contexts/auth-context"
import { useWearHistory } from "@/lib/queries"
import { getWeeklyQuests, type ActiveQuest } from "@/lib/gamification"

// Bridges getWeeklyQuests() to the app's live data sources, same pattern as
// use-gamification.ts, so both the quest-completed toast (mounted once in
// (tabs)/_layout.tsx) and the Weekly Quests card (Collection tab) share one
// computation instead of each wiring up events/collection themselves.
export const useWeeklyQuests = (): ActiveQuest[] => {
  const { user, userCollection } = useAuth()
  const { data: events } = useWearHistory(user?.id)

  return useMemo(
    () => getWeeklyQuests(events ?? [], userCollection, new Date()),
    [events, userCollection]
  )
}

export default useWeeklyQuests
