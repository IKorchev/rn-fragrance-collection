import { Alert } from "react-native"
import { presentPaywall } from "@/lib/purchases"

// Free-vs-Pro entitlement boundary for this app (see CLAUDE.md "Monetization").
// Free keeps the whole core loop useful: unlimited wear logging/undo, tags,
// a collection up to FREE_COLLECTION_LIMIT, an unfiltered weighted-random
// picker, and a day-grouped wear diary with a basic stat strip. Pro unlocks
// power-user tools layered on the same data — nothing free users have gets
// worse: picker filtering (by tag/brand/unworn), wear-history filtering +
// insights, and an unlimited collection (on top of the already-shipped
// ad-free picker).
export const FREE_COLLECTION_LIMIT = 40

// Exact text raised by the enforce_free_tier_collection_cap trigger
// (db/schema.sql) — matched verbatim so the client can tell "you hit the free
// cap" apart from a generic insert failure.
export const FREE_TIER_LIMIT_ERROR = "free_tier_collection_limit"

export const isFreeTierLimitError = (error: unknown): boolean => {
  const message = (error as { message?: string } | null)?.message
  return typeof message === "string" && message.includes(FREE_TIER_LIMIT_ERROR)
}

// Streak Saver (Pro perk) RPC error messages — matched verbatim against
// use_streak_save's RAISE EXCEPTION text (db/schema.sql), same convention as
// FREE_TIER_LIMIT_ERROR above.
export const STREAK_SAVER_REQUIRES_PRO_ERROR = "streak_saver_requires_pro"
export const STREAK_SAVER_DATE_OUT_OF_RANGE_ERROR = "streak_saver_date_out_of_range"
export const STREAK_SAVER_MONTHLY_LIMIT_ERROR = "streak_saver_monthly_limit"

const rpcErrorMessage = (error: unknown): string | undefined =>
  (error as { message?: string } | null)?.message

// The auto-save flow (src/lib/utils/use-streak-saver.ts) hits this whenever
// a user has already spent both of this month's saves on earlier breaks —
// an expected, silent no-op, not a real failure worth alerting on.
export const isStreakSaverMonthlyLimitError = (error: unknown): boolean =>
  rpcErrorMessage(error)?.includes(STREAK_SAVER_MONTHLY_LIMIT_ERROR) ?? false

// Shared upsell prompt for a locked Pro surface — same copy pattern wherever
// a free user hits a gated feature (collection cap, picker filters,
// wear-history insights).
export const promptProUpsell = (title: string, message: string) => {
  Alert.alert(title, message, [
    { text: "Not now", style: "cancel" },
    {
      text: "Upgrade",
      onPress: () => {
        presentPaywall()
      },
    },
  ])
}
