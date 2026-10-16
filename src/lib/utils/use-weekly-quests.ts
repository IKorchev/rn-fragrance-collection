import { useMemo } from "react"
import useAuth from "@/contexts/auth-context"
import { useWearHistory } from "@/lib/queries"
import { getWeeklyQuests, type ActiveQuest } from "@/lib/gamification"
import useRatedCollection from "@/lib/utils/use-rated-collection"

// Bridges getWeeklyQuests() to the app's live data sources, same pattern as
// use-gamification.ts, so both the quest-completed toast (mounted once in
// (tabs)/_layout.tsx) and the Weekly Quests card (Collection tab) share one
// computation instead of each wiring up events/collection themselves.
export const useWeeklyQuests = (): ActiveQuest[] => {
  const { user } = useAuth()
  const collection = useRatedCollection()
  const { data: events } = useWearHistory(user?.id)

  return useMemo(
    () => getWeeklyQuests(events ?? [], collection, new Date()),
    [events, collection]
  )
}

export default useWeeklyQuests
