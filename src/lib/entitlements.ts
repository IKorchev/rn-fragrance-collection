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
