// Weekly quests — fully derived from wear_events + the collection snapshot,
// same philosophy as the rest of src/lib/gamification: a pure function of
// (events, collection, now), no stored quest state anywhere. This means
// completed-quest XP is recomputed from scratch every time (see
// totalQuestXp below) rather than persisted, so it can never drift from the
// underlying wear history.
//
// Week = Monday-start, device-local (matches the streak's device-local-day
// semantics elsewhere in this module). Which 3 quests are "active" a given
// week is a deterministic rotation seeded from the ISO week number + year —
// same 3 quests for every user that week, a different trio next week.
import { brandOf } from "@/lib/utils/collection-facets"

export const XP_PER_QUEST = 50

export interface QuestWearEvent {
  worn_at: string
  name: string
}

export interface QuestCollectionItem {
  name: string
  times_worn: number
  rating: number | null
}

type ProgressFn = (
  weekEvents: QuestWearEvent[],
  allEvents: QuestWearEvent[],
  collection: QuestCollectionItem[]
) => number

export interface QuestDefinition {
  id: string
  target: number
  xpReward: number
  progressFn: ProgressFn
}

export type ActiveQuest = QuestDefinition & {
  current: number
  progress: number // 0..1
  completed: boolean
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const distinctDaysWorn = (events: QuestWearEvent[]): number =>
  new Set(events.map((e) => new Date(e.worn_at).toDateString())).size

const distinctNamesWorn = (events: QuestWearEvent[]): number => new Set(events.map((e) => e.name)).size

const distinctBrandsWorn = (events: QuestWearEvent[]): number =>
  new Set(events.map((e) => brandOf(e.name))).size

// True for an event that is the chronologically first-ever wear of its
// fragrance across the whole history — well-defined regardless of which
// week we're evaluating (no need for explicit week boundaries), since it
// only compares against strictly-earlier timestamps of the same name.
const isFirstEverWear = (event: QuestWearEvent, allEvents: QuestWearEvent[]): boolean => {
  const ts = new Date(event.worn_at).getTime()
  return !allEvents.some((a) => a.name === event.name && new Date(a.worn_at).getTime() < ts)
}

// A "dust off" moment: re-wearing something at least 30 days after the most
// recent PRIOR wear of that same fragrance (prior = strictly earlier
// timestamp, found in the full history so it works under historical
// recomputation too — see totalQuestXp).
const hasDustOffMoment = (weekEvents: QuestWearEvent[], allEvents: QuestWearEvent[]): boolean => {
  for (const e of weekEvents) {
    const ts = new Date(e.worn_at).getTime()
    let mostRecentPrior = -Infinity
    for (const a of allEvents) {
      if (a.name !== e.name) continue
      const aTs = new Date(a.worn_at).getTime()
      if (aTs < ts && aTs > mostRecentPrior) mostRecentPrior = aTs
    }
    if (mostRecentPrior !== -Infinity && ts - mostRecentPrior >= THIRTY_DAYS_MS) return true
  }
  return false
}

// Note on `collection` in the progress functions below: it's the CURRENT
// collection snapshot (e.g. today's rating), not a point-in-time snapshot of
// what the rating was that week. Recomputing a past week's completion with
// today's data is an intentional tradeoff of the "no stored state, pure
// function of current data" design this whole module follows (see
// computeStreak/evaluateBadges) — rating a fragrance 4★ today can
// retroactively "complete" a past week's favorite-4 quest. Acceptable: quest
// XP is a bonus trickle, not a leaderboard-integrity concern.
export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: "days-3",
    target: 3,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents) => distinctDaysWorn(weekEvents),
  },
  {
    id: "days-5",
    target: 5,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents) => distinctDaysWorn(weekEvents),
  },
  {
    id: "scents-3",
    target: 3,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents) => distinctNamesWorn(weekEvents),
  },
  {
    id: "brands-2",
    target: 2,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents) => distinctBrandsWorn(weekEvents),
  },
  {
    id: "wears-7",
    target: 7,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents) => weekEvents.length,
  },
  {
    id: "dust-off",
    target: 1,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents, allEvents) => (hasDustOffMoment(weekEvents, allEvents) ? 1 : 0),
  },
  {
    id: "favorite-4",
    target: 1,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents, _allEvents, collection) => {
      const ratedNames = new Set(collection.filter((c) => (c.rating ?? 0) >= 4).map((c) => c.name))
      return weekEvents.some((e) => ratedNames.has(e.name)) ? 1 : 0
    },
  },
  {
    id: "first-wear",
    target: 1,
    xpReward: XP_PER_QUEST,
    progressFn: (weekEvents, allEvents) =>
      weekEvents.some((e) => isFirstEverWear(e, allEvents)) ? 1 : 0,
  },
]

const QUEST_POOL_SIZE = QUEST_DEFINITIONS.length
export const ACTIVE_QUESTS_PER_WEEK = 3

// Monday-start-of-week, device-local midnight.
const weekStart = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday ... 6 = Saturday
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d
}

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Standard ISO-8601 week/year ("the week containing this date's Thursday").
// Computed purely from Y/M/D (via Date.UTC) so device-local wall-clock dates
// don't get nudged across a boundary by DST/timezone offsets during the math.
const isoWeekYear = (date: Date): { year: number; week: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon = 0 ... Sun = 6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // Thursday of this ISO week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return { year: d.getUTCFullYear(), week }
}

// Deterministic PRNG (mulberry32) — same seed always produces the same
// shuffle, which is what makes the weekly rotation identical for every user.
const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seededShuffle = <T,>(items: T[], seed: number): T[] => {
  const rand = mulberry32(seed)
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Which quest ids are active for a given ISO (year, week) — a shuffle of the
// whole pool keyed by that pair, so the first ACTIVE_QUESTS_PER_WEEK entries
// are always distinct by construction.
export const questIdsForIsoWeek = (year: number, isoWeek: number): string[] => {
  const seed = year * 100 + isoWeek
  return seededShuffle(
    QUEST_DEFINITIONS.map((q) => q.id),
    seed
  ).slice(0, ACTIVE_QUESTS_PER_WEEK)
}

// The 3 active quests for the week containing `now`, with live progress.
export const getWeeklyQuests = (
  events: QuestWearEvent[],
  collection: QuestCollectionItem[],
  now: Date = new Date()
): ActiveQuest[] => {
  const start = weekStart(now)
  const end = addDays(start, 7)
  const startMs = start.getTime()
  const endMs = end.getTime()
  const weekEvents = events.filter((e) => {
    const ts = new Date(e.worn_at).getTime()
    return ts >= startMs && ts < endMs
  })

  const { year, week } = isoWeekYear(start)
  const ids = questIdsForIsoWeek(year, week)

  return ids.map((id) => {
    const def = QUEST_DEFINITIONS.find((q) => q.id === id)!
    const current = def.progressFn(weekEvents, events, collection)
    const progress = def.target > 0 ? Math.min(current / def.target, 1) : 0
    return { ...def, current, progress, completed: current >= def.target }
  })
}

// Sum of xpReward for every completed quest across every past week since the
// first-ever event, recomputed with the SAME deterministic rotation each
// week used at the time — this is what keeps quest XP fully derived instead
// of a stored/accumulated counter that could desync from history.
export const totalQuestXp = (
  events: QuestWearEvent[],
  collection: QuestCollectionItem[],
  now: Date = new Date()
): number => {
  if (events.length === 0) return 0

  const earliestMs = Math.min(...events.map((e) => new Date(e.worn_at).getTime()))
  let cursor = weekStart(new Date(earliestMs))
  const lastWeek = weekStart(now)

  let total = 0
  // Bounded by real wear history span — fine for the years of daily use this
  // app expects; each iteration itself is O(events), so a many-year history
  // is still fast in practice for a personal wear diary.
  while (cursor.getTime() <= lastWeek.getTime()) {
    const quests = getWeeklyQuests(events, collection, cursor)
    for (const q of quests) if (q.completed) total += q.xpReward
    cursor = addDays(cursor, 7)
  }
  return total
}

// Stable per-week identifier (ISO year + week number) — used by the
// quest-completed toast (src/lib/utils/use-quest-alerts.ts) to key its
// AsyncStorage "already notified" snapshot per week, so a quest id that
// happens to recur in a later, non-adjacent week (56 possible 3-of-8
// combinations, so repeats do happen) is still tracked as a fresh
// completion rather than being suppressed by a stale snapshot.
export const weekKeyFor = (now: Date = new Date()): string => {
  const { year, week } = isoWeekYear(weekStart(now))
  return `${year}-W${week}`
}

export { QUEST_POOL_SIZE }
