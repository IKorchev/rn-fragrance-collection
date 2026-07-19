// XP economy — the only three ways XP enters the system. Kept as named
// constants (rather than inlined) since other agents' quest work adds a
// fourth via `bonusXp` on computeGamification's input, and may want to read
// these for balancing.
export const XP_PER_WEAR = 10
export const XP_PER_BADGE = 25

// Cumulative XP required to REACH each level (1-based; level 1 starts at 0
// XP, so there's no "level 0"). Quadratic curve — threshold(L) = 50*L*(L-1)
// — front-loads pacing (level 2 needs only 100 XP: ~a week of daily wears
// plus the "First Whiff" badge) and stretches out fast after that (level 10
// needs 4500 XP, i.e. many months of daily use even with every badge banked).
// Deterministic and monotonic by construction — every call with the same xp
// returns the same level.
const LEVEL_THRESHOLDS: number[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1
  return 50 * level * (level - 1)
})

export const MAX_LEVEL = LEVEL_THRESHOLDS.length

// i18n keys, not display strings — callers resolve these via t(). See
// locales/en.ts + es.ts under `gamification.levels.*` for the copy.
export const LEVEL_TITLE_KEYS: string[] = Array.from(
  { length: MAX_LEVEL },
  (_, i) => `gamification.levels.${i + 1}`
)

export interface LevelInfo {
  level: number
  levelTitle: string
  levelProgress: number
  xpIntoLevel: number
  xpForNextLevel: number
}

// Resolves total XP into a level + progress-within-level. At MAX_LEVEL there
// is no "next" level to progress toward, so levelProgress pins at 1 and
// xpForNextLevel at 0 rather than dividing by a nonexistent span.
export function levelForXp(xp: number): LevelInfo {
  let level = 1
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xp >= LEVEL_THRESHOLDS[l - 1]) {
      level = l
      break
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1]
  const xpIntoLevel = xp - currentThreshold

  if (level >= MAX_LEVEL) {
    return {
      level,
      levelTitle: LEVEL_TITLE_KEYS[level - 1],
      levelProgress: 1,
      xpIntoLevel,
      xpForNextLevel: 0,
    }
  }

  const span = LEVEL_THRESHOLDS[level] - currentThreshold
  return {
    level,
    levelTitle: LEVEL_TITLE_KEYS[level - 1],
    levelProgress: span > 0 ? xpIntoLevel / span : 1,
    xpIntoLevel,
    xpForNextLevel: span,
  }
}
