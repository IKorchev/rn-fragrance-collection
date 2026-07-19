import { Share } from "react-native"

// "Brand - Title" convention (see CLAUDE.md) rendered as an em dash for share
// text — matches the split used by card.tsx/collection-list-item.tsx etc.
export const splitFragranceName = (name: string) => {
  const parts = name.split(" - ")
  const brand = parts[0]
  const title = parts.slice(1).join(" - ")
  return { brand, title }
}

export const displayFragranceName = (name: string) => {
  const { brand, title } = splitFragranceName(name)
  return title ? `${brand} — ${title}` : brand
}

export interface ShareFragranceLike {
  name: string
  timesWorn?: number
  // Personal (not community) rating — the user's own opinion, shared only
  // when they explicitly opt in via the share sheet's toggle.
  rating?: number | null
}

type Translate = (key: string, params?: Record<string, string | number>) => string

export interface FragranceShareOptions {
  includeTimesWorn?: boolean
  includeRating?: boolean
}

// Never includes personal notes, price/value, user ids, or the full wear
// diary — only the fragrance's own name, plus times-worn/rating when the
// caller has the user's explicit per-toggle consent.
const withOptionalStats = (
  t: Translate,
  lines: string[],
  fragrance: ShareFragranceLike,
  options: FragranceShareOptions
) => {
  if (options.includeTimesWorn && typeof fragrance.timesWorn === "number") {
    lines.push(t("share.timesWornFragment", { count: fragrance.timesWorn }))
  }
  if (options.includeRating && typeof fragrance.rating === "number") {
    lines.push(t("share.ratingFragment", { stars: fragrance.rating }))
  }
  lines.push(t("share.appSignature"))
  return lines.join("\n")
}

export const buildFragranceShareText = (
  t: Translate,
  fragrance: ShareFragranceLike,
  options: FragranceShareOptions = {}
): string =>
  withOptionalStats(
    t,
    [t("share.fragranceMessage", { name: displayFragranceName(fragrance.name) })],
    fragrance,
    options
  )

export const buildTodaysScentShareText = (
  t: Translate,
  fragrance: ShareFragranceLike,
  options: FragranceShareOptions = {}
): string =>
  withOptionalStats(
    t,
    [t("share.todayMessage", { name: displayFragranceName(fragrance.name) })],
    fragrance,
    options
  )

export const buildPickerResultShareText = (t: Translate, fragrance: ShareFragranceLike): string =>
  [t("share.pickerMessage", { name: displayFragranceName(fragrance.name) }), t("share.appSignature")].join(
    "\n"
  )

export interface RecapStats {
  monthWears: number
  streak: number
  collectionSize: number
}

// Aggregate-only recap — every number here is already visible elsewhere on
// the profile screen, so there's nothing to gate behind a toggle; the share
// sheet's preview is the user's chance to back out before sending.
export const buildRecapShareText = (t: Translate, stats: RecapStats): string => {
  const lines = [t("share.recapIntro"), t("share.wearsFragment", { count: stats.monthWears })]
  if (stats.streak > 0) lines.push(t("share.streakFragment", { count: stats.streak }))
  lines.push(t("share.collectionFragment", { count: stats.collectionSize }))
  lines.push(t("share.appSignature"))
  return lines.join("\n")
}

export interface MonthlyRecapShareStats {
  month: string // already-formatted display month, e.g. "June"
  wears: number
  // Display name (already run through displayFragranceName), null when the
  // month had no wears logged against any single fragrance
  topFragranceName?: string | null
  // Best streak achieved within that month (not the live current streak)
  streak: number
  badgesCount: number
  // Already-resolved display string (caller passes t(state.levelTitle)) —
  // matches every other i18n-key field in this file, which are always
  // resolved by the caller before reaching a builder.
  levelTitle: string
}

// "Your Month in Whiffs" recap share (src/app/monthly-recap.tsx) — a richer,
// once-a-month sibling of buildRecapShareText's month-to-date snapshot.
// Same aggregate-only rule applies: every figure here is already visible on
// the recap screen itself, nothing gated behind a toggle.
export const buildMonthlyRecapShareText = (t: Translate, stats: MonthlyRecapShareStats): string => {
  const lines = [t("recap.shareIntro", { month: stats.month })]
  lines.push(t("recap.shareWearsFragment", { count: stats.wears }))
  if (stats.topFragranceName) {
    lines.push(t("recap.shareTopFragment", { name: stats.topFragranceName }))
  }
  if (stats.streak > 0) lines.push(t("recap.shareStreakFragment", { count: stats.streak }))
  if (stats.badgesCount > 0) {
    lines.push(t("recap.shareBadgesFragment", { count: stats.badgesCount }))
  }
  lines.push(t("recap.shareLevelFragment", { title: stats.levelTitle }))
  lines.push(t("share.appSignature"))
  return lines.join("\n")
}

// Wraps RN core's Share API — no extra native module, so this works in the
// existing dev-client build without a rebuild. Returns whether the user
// actually completed a share (vs. dismissing the sheet).
export const shareText = async (message: string): Promise<boolean> => {
  const result = await Share.share({ message })
  return result.action === Share.sharedAction
}
