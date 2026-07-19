import type { EarnedBadge } from "@/lib/gamification"

// Picks the badges most worth surfacing in a compact preview (Profile's
// 3-badge row): the most notable earned badges first — biggest target is
// used as a proxy for "most recently earned", since the core module is
// stateless and doesn't track earn timestamps — topped up with whichever
// locked badges are closest to unlocking, so the row always reads as "look
// what you've done" plus "here's what's next."
export const pickHighlightBadges = (badges: EarnedBadge[], count = 3): EarnedBadge[] => {
  const earned = [...badges].filter((b) => b.earned).sort((a, b) => b.target - a.target)
  const locked = [...badges].filter((b) => !b.earned).sort((a, b) => b.progress - a.progress)
  return [...earned, ...locked].slice(0, count)
}
