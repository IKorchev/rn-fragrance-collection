import { brandOf } from "@/lib/utils/collection-facets"
import type { WearStats } from "./index"

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
  wears: WearStats
  collection: { name: string; times_worn: number; rating: number | null }[]
  streak: number
}

// Distinct brands actually worn — derived from wear history (not the
// collection), so a fragrance added but never worn doesn't count toward
// "explorer" badges.
const distinctBrandsWorn = (wearsByName: Map<string, number>): number =>
  new Set(Array.from(wearsByName.keys(), brandOf)).size

// Largest number of wears logged against any single fragrance name — powers
// the "Loyalist" special badge.
const maxSameFragranceWears = (wearsByName: Map<string, number>): number =>
  Math.max(0, ...wearsByName.values())

// Dispatches each badge id to its current progress count, based on the id
// prefix convention established in BADGE_DEFINITIONS above.
const metricFor = (id: string, ctx: BadgeContext): number => {
  if (id.startsWith("streak-")) return ctx.streak
  if (id.startsWith("wears-")) return ctx.wears.totalWears
  if (id.startsWith("collection-")) return ctx.collection.length
  if (id.startsWith("explorer-")) return distinctBrandsWorn(ctx.wears.wearsByName)
  if (id === "special-dusted-off") return ctx.wears.dustedOff ? 1 : 0
  if (id === "special-loyalist") return maxSameFragranceWears(ctx.wears.wearsByName)
  return 0
}

export const evaluateBadges = (ctx: BadgeContext): EarnedBadge[] =>
  BADGE_DEFINITIONS.map((def) => {
    const current = metricFor(def.id, ctx)
    const progress = def.target > 0 ? Math.min(current / def.target, 1) : 0
    return { ...def, current, progress, earned: current >= def.target }
  })
