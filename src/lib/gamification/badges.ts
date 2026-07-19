import { brandOf } from "@/lib/utils/collection-facets"

export type BadgeTier = 1 | 2 | 3

export type BadgeCategory = "streak" | "wears" | "collection" | "explorer" | "special"

export type BadgeDefinition = {
  id: string
  category: BadgeCategory
  tier: BadgeTier
  icon: string // MaterialCommunityIcons name
  target: number
}

export type EarnedBadge = BadgeDefinition & {
  earned: boolean
  progress: number // 0..1 toward target
  current: number // current count toward target
}

// 16 badges across 5 categories, every one computable purely from wear
// events + the collection snapshot (no clock-of-day, no randomness — see
// CLAUDE.md-adjacent brief on why: deterministic replay from the same data
// must always produce the same badge state).
//
// id prefixes double as the dispatch key in `metricFor` below, and as the
// i18n key stem for display copy: `gamification.badges.<id>.name` /
// `gamification.badges.<id>.description` (see locales/en.ts + es.ts).
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Daily streak milestones
  { id: "streak-3", category: "streak", tier: 1, icon: "fire", target: 3 },
  { id: "streak-7", category: "streak", tier: 2, icon: "fire", target: 7 },
  { id: "streak-30", category: "streak", tier: 3, icon: "fire", target: 30 },
  { id: "streak-100", category: "streak", tier: 3, icon: "fire", target: 100 },

  // Total logged wears — wears-1 ("First Whiff") is the very first log
  { id: "wears-1", category: "wears", tier: 1, icon: "bottle-tonic-outline", target: 1 },
  { id: "wears-25", category: "wears", tier: 2, icon: "bottle-tonic", target: 25 },
  { id: "wears-100", category: "wears", tier: 3, icon: "trophy-award", target: 100 },
  { id: "wears-500", category: "wears", tier: 3, icon: "crown", target: 500 },

  // Collection size
  { id: "collection-5", category: "collection", tier: 1, icon: "archive-outline", target: 5 },
  { id: "collection-15", category: "collection", tier: 2, icon: "archive", target: 15 },
  { id: "collection-40", category: "collection", tier: 3, icon: "treasure-chest", target: 40 },

  // Distinct brands actually worn (not just added)
  { id: "explorer-3", category: "explorer", tier: 1, icon: "compass-outline", target: 3 },
  { id: "explorer-8", category: "explorer", tier: 2, icon: "compass", target: 8 },
  { id: "explorer-15", category: "explorer", tier: 3, icon: "earth", target: 15 },

  // Special, event-history-derived one-offs
  { id: "special-dusted-off", category: "special", tier: 2, icon: "clock-alert-outline", target: 1 },
  { id: "special-loyalist", category: "special", tier: 2, icon: "heart", target: 10 },
]

interface BadgeContext {
  events: { worn_at: string; name: string }[]
  collection: { name: string; times_worn: number; rating: number | null }[]
  streak: number
}

// Distinct brands actually worn — derived from events (not the collection),
// so a fragrance added but never worn doesn't count toward "explorer" badges.
const distinctBrandsWorn = (events: { name: string }[]): number =>
  new Set(events.map((e) => brandOf(e.name))).size

// Largest number of wears logged against any single fragrance name — powers
// the "Loyalist" special badge.
const maxSameFragranceWears = (events: { name: string }[]): number => {
  const counts = new Map<string, number>()
  for (const e of events) counts.set(e.name, (counts.get(e.name) ?? 0) + 1)
  let max = 0
  for (const count of counts.values()) if (count > max) max = count
  return max
}

// "Dusted Off": true once any fragrance has been re-worn at least 30 days
// after its previous wear — a signal the wearer rediscovered something
// forgotten in the back of the drawer, not just a fast, recent repeat.
const hasDustedOffMoment = (events: { worn_at: string; name: string }[]): boolean => {
  const byName = new Map<string, number[]>()
  for (const e of events) {
    const list = byName.get(e.name)
    const ts = new Date(e.worn_at).getTime()
    if (list) list.push(ts)
    else byName.set(e.name, [ts])
  }
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  for (const timestamps of byName.values()) {
    const sorted = [...timestamps].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] >= THIRTY_DAYS_MS) return true
    }
  }
  return false
}

// Dispatches each badge id to its current progress count, based on the id
// prefix convention established in BADGE_DEFINITIONS above.
const metricFor = (id: string, ctx: BadgeContext): number => {
  if (id.startsWith("streak-")) return ctx.streak
  if (id.startsWith("wears-")) return ctx.events.length
  if (id.startsWith("collection-")) return ctx.collection.length
  if (id.startsWith("explorer-")) return distinctBrandsWorn(ctx.events)
  if (id === "special-dusted-off") return hasDustedOffMoment(ctx.events) ? 1 : 0
  if (id === "special-loyalist") return maxSameFragranceWears(ctx.events)
  return 0
}

export const evaluateBadges = (ctx: BadgeContext): EarnedBadge[] =>
  BADGE_DEFINITIONS.map((def) => {
    const current = metricFor(def.id, ctx)
    const progress = def.target > 0 ? Math.min(current / def.target, 1) : 0
    return { ...def, current, progress, earned: current >= def.target }
  })
