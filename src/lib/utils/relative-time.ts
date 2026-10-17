import { translateDefault } from "@/lib/i18n/translate"

// Calendar-day-based phrasing ("today", "yesterday", "5 days ago") — matches
// the once-per-day wear semantics (device-local days), so a wear logged at
// 23:59 reads "yesterday" right after midnight.
export const formatRelativeDay = (iso: string): string => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000)

  if (days <= 0) return translateDefault("relative.today")
  if (days === 1) return translateDefault("relative.yesterday")
  if (days < 7) return translateDefault("relative.days", { count: days })
  if (days < 30) return translateDefault("relative.weeks", { count: Math.round(days / 7) })
  if (days < 365) return translateDefault("relative.months", { count: Math.round(days / 30) })
  return translateDefault("relative.years", { count: Math.round(days / 365) })
}
