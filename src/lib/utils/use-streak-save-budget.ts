import { useMemo } from "react"
import useAuth from "@/contexts/auth-context"
import { useStreakSaves } from "@/lib/queries"

// Must match the RPC's monthly cap (use_streak_save in db/schema.sql — "used
// < 2 saves in the calendar month of p_saved_date").
export const STREAK_SAVES_PER_MONTH = 2

export interface StreakSaveBudget {
  used: number
  remaining: number
  limit: number
}

// Client-side mirror of the RPC's monthly cap, for the subtle "N left this
// month" footer (Weekly Quests card) — undefined while the saves query is
// still loading, so callers can skip rendering rather than flash a wrong 2/2.
export const useStreakSaveBudget = (): StreakSaveBudget | undefined => {
  const { user } = useAuth()
  const { data: saves } = useStreakSaves(user?.id)

  return useMemo(() => {
    if (!saves) return undefined
    const now = new Date()
    // Bucketed by saved_date's month (the RPC's cap is "per calendar month of
    // p_saved_date"), not the row's created_at.
    const used = saves.filter((row) => {
      const d = new Date(`${row.saved_date}T00:00:00`)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
    return { used, remaining: Math.max(STREAK_SAVES_PER_MONTH - used, 0), limit: STREAK_SAVES_PER_MONTH }
  }, [saves])
}

export default useStreakSaveBudget
