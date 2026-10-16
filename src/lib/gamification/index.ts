// Pure, deterministic gamification core — no I/O, no AsyncStorage, no
// clock reads other than the `now` a caller explicitly passes in. Everything
// here is a straight function of (wear stats, collection, now) so it can be unit
// tested and safely replayed. Side-effecting concerns (persisting a
// last-seen snapshot, firing a toast) live in src/lib/utils/*, not here.
import { evaluateBadges, type EarnedBadge } from "./badges"

export { BADGE_DEFINITIONS, evaluateBadges } from "./badges"
export type { BadgeDefinition, BadgeTier, BadgeCategory, EarnedBadge } from "./badges"

export type StreakOptions = {
  // Keys are Date.toDateString() values. A freeze date fills a gap day as if
  // it had been worn — used by the (separate) streak-saver workstream to let
  // a user spend a save on a day they'd otherwise break their streak.
  freezeDates?: Set<string>
}

export type GamificationState = {
  streak: number
  badges: EarnedBadge[] // ALL badges with earned/progress state
  earnedCount: number
}

// The wear-history facts badges and streaks need, independent of how many raw
// events back them. Built from the uncapped wear_summary RPC in the app
// (wearStatsFromSummary) or from a raw event list (wearStatsFromEvents — e.g.
// a point-in-time slice), so both paths feed the same badge/streak logic.
export type WearStats = {
  totalWears: number
  wornDays: Set<string> // Date.toDateString() keys, device-local
  wearsByName: Map<string, number>
  // Some fragrance re-worn >= 30 days after its previous wear (the
  // "Dusted Off" badge)
  dustedOff: boolean
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function wearStatsFromEvents(events: { worn_at: string; name: string }[]): WearStats {
  const wornDays = new Set<string>()
  const wearsByName = new Map<string, number>()
  const timestampsByName = new Map<string, number[]>()
  for (const e of events) {
    const date = new Date(e.worn_at)
    wornDays.add(date.toDateString())
    wearsByName.set(e.name, (wearsByName.get(e.name) ?? 0) + 1)
    const list = timestampsByName.get(e.name)
    if (list) list.push(date.getTime())
    else timestampsByName.set(e.name, [date.getTime()])
  }
  let dustedOff = false
  for (const timestamps of timestampsByName.values()) {
    const sorted = [...timestamps].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length && !dustedOff; i++) {
      if (sorted[i] - sorted[i - 1] >= THIRTY_DAYS_MS) dustedOff = true
    }
  }
  return { totalWears: events.length, wornDays, wearsByName, dustedOff }
}

// Rows from the wear_summary RPC (one per collection row + name). worn_days
// are already device-local "YYYY-MM-DD" dates (the RPC takes the device
// timezone), parsed at local midnight the same way streak_saves dates are.
export function wearStatsFromSummary(
  rows: { name: string; wears: number; dusted_off: boolean; worn_days: string[] }[]
): WearStats {
  const wornDays = new Set<string>()
  const wearsByName = new Map<string, number>()
  let totalWears = 0
  let dustedOff = false
  for (const row of rows) {
    totalWears += row.wears
    wearsByName.set(row.name, (wearsByName.get(row.name) ?? 0) + row.wears)
    if (row.dusted_off) dustedOff = true
    for (const day of row.worn_days) wornDays.add(new Date(`${day}T00:00:00`).toDateString())
  }
  return { totalWears, wornDays, wearsByName, dustedOff }
}

// A streak survives until a full local day is missed: it counts from today
// if today's already been worn, otherwise from yesterday (today just hasn't
// happened yet, so it doesn't break anything). Same device-local-day
// semantics as the once-per-day wear cap (see worn-today.ts), with
// `freezeDates` layered on top: a frozen date counts as if worn, letting a
// gap day keep the streak alive without needing a real event.
export function computeStreak(
  wornDays: Set<string>,
  now: Date = new Date(),
  opts?: StreakOptions
): number {
  const freezeDates = opts?.freezeDates
  const countsAsWorn = (key: string) => wornDays.has(key) || !!freezeDates?.has(key)

  let streak = 0
  const cursor = new Date(now)
  if (!countsAsWorn(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  while (countsAsWorn(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeGamification(
  input: {
    collection: { name: string; times_worn: number; rating: number | null }[]
    streakOptions?: StreakOptions
    now?: Date
  } & (
    // Precomputed stats (the uncapped app path) or a raw event list
    { wears: WearStats } | { events: { worn_at: string; name: string }[] }
  )
): GamificationState {
  const now = input.now ?? new Date()
  const wears = "wears" in input ? input.wears : wearStatsFromEvents(input.events)
  const streak = computeStreak(wears.wornDays, now, input.streakOptions)
  const badges = evaluateBadges({ wears, collection: input.collection, streak })
  return { streak, badges, earnedCount: badges.filter((b) => b.earned).length }
}
