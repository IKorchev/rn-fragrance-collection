// Pure, deterministic gamification core — no I/O, no AsyncStorage, no
// clock reads other than the `now` a caller explicitly passes in. Everything
// here is a straight function of (events, collection, now) so it can be unit
// tested and safely replayed. Side-effecting concerns (persisting a
// last-seen snapshot, firing a toast) live in src/lib/utils/*, not here.
import { XP_PER_WEAR, XP_PER_BADGE, levelForXp } from "./levels"
import { evaluateBadges, type EarnedBadge } from "./badges"

export { XP_PER_WEAR, XP_PER_BADGE, MAX_LEVEL, LEVEL_TITLE_KEYS, levelForXp } from "./levels"
export { BADGE_DEFINITIONS, evaluateBadges } from "./badges"
export type { BadgeDefinition, BadgeTier, BadgeCategory, EarnedBadge } from "./badges"
export {
  QUEST_DEFINITIONS,
  XP_PER_QUEST,
  ACTIVE_QUESTS_PER_WEEK,
  getWeeklyQuests,
  totalQuestXp,
  questIdsForIsoWeek,
  weekKeyFor,
} from "./quests"
export type { QuestDefinition, ActiveQuest, QuestWearEvent, QuestCollectionItem } from "./quests"

export type StreakOptions = {
  // Keys are Date.toDateString() values. A freeze date fills a gap day as if
  // it had been worn — used by the (separate) streak-saver workstream to let
  // a user spend a save on a day they'd otherwise break their streak.
  freezeDates?: Set<string>
}

export type GamificationState = {
  xp: number
  level: number // 1-based
  levelTitle: string // i18n key (e.g. "gamification.levels.3"), resolve via t()
  levelProgress: number // 0..1 within current level
  xpIntoLevel: number
  xpForNextLevel: number
  streak: number
  badges: EarnedBadge[] // ALL badges with earned/progress state
  earnedCount: number
}

// A streak survives until a full local day is missed: it counts from today
// if today's already been worn, otherwise from yesterday (today just hasn't
// happened yet, so it doesn't break anything). This is an exact port of the
// inline logic that used to live in the Profile screen's useMemo — same
// device-local-day semantics as the once-per-day wear cap (see worn-today.ts)
// — with `freezeDates` layered on top: a frozen date counts as if worn,
// letting a gap day keep the streak alive without needing a real event.
export function computeStreak(
  events: { worn_at: string }[],
  now: Date = new Date(),
  opts?: StreakOptions
): number {
  const freezeDates = opts?.freezeDates
  const wornDays = new Set(events.map((e) => new Date(e.worn_at).toDateString()))
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

export function computeGamification(input: {
  events: { worn_at: string; name: string }[]
  collection: { name: string; times_worn: number; rating: number | null }[]
  // Quest XP, supplied by another workstream — just added to the total
  // before the level calc runs.
  bonusXp?: number
  streakOptions?: StreakOptions
  now?: Date
}): GamificationState {
  const now = input.now ?? new Date()
  const streak = computeStreak(input.events, now, input.streakOptions)
  const badges = evaluateBadges({ events: input.events, collection: input.collection, streak })
  const earnedCount = badges.filter((b) => b.earned).length

  // XP rules (fixed): +10 per logged wear, +25 per earned badge, + whatever
  // bonusXp the caller supplies (quest rewards, etc.)
  const xp = input.events.length * XP_PER_WEAR + earnedCount * XP_PER_BADGE + (input.bonusXp ?? 0)

  const { level, levelTitle, levelProgress, xpIntoLevel, xpForNextLevel } = levelForXp(xp)

  return {
    xp,
    level,
    levelTitle,
    levelProgress,
    xpIntoLevel,
    xpForNextLevel,
    streak,
    badges,
    earnedCount,
  }
}
