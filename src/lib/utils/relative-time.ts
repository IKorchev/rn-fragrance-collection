// Calendar-day-based phrasing ("today", "yesterday", "5 days ago") — matches
// the once-per-day wear semantics (device-local days), so a wear logged at
// 23:59 reads "yesterday" right after midnight.
export const formatRelativeDay = (iso: string): string => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000)

  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.round(days / 7)
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  }
  if (days < 365) {
    const months = Math.round(days / 30)
    return months === 1 ? "1 month ago" : `${months} months ago`
  }
  const years = Math.round(days / 365)
  return years === 1 ? "1 year ago" : `${years} years ago`
}
