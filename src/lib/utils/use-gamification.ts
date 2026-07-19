import { useMemo } from "react"
import useAuth from "@/contexts/auth-context"
import { useWearHistory } from "@/lib/queries"
import { computeGamification, type GamificationState } from "@/lib/gamification"

// Bridges the pure computeGamification() core to the app's live data sources
// (the personal wear diary + the collection query already owned by
// AuthContext) so screens don't have to wire that up themselves. Events
// default to `[]` while useWearHistory is still loading, same as the old
// inline profile useMemo did — the header just briefly shows 0s rather than
// gating on a loading flag.
export const useGamification = (): GamificationState => {
  const { user, userCollection } = useAuth()
  const { data: events } = useWearHistory(user?.id)

  return useMemo(
    () => computeGamification({ events: events ?? [], collection: userCollection }),
    [events, userCollection]
  )
}

export default useGamification
