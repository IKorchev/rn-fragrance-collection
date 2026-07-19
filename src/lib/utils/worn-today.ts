// Device IANA timezone — sent to the increment_wear RPC so "once per day"
// means the user's calendar day, not UTC's (the RPC falls back to UTC itself
// on bad input, this fallback just keeps the call well-formed)
export const deviceTimeZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
  } catch {
    return "UTC"
  }
})()

// Client-side mirror of the RPC's same-calendar-day check (both use the
// device's timezone), for dimming wear buttons before the server says no
export const isWornToday = (lastWorn: string | null | undefined): boolean => {
  if (!lastWorn) return false
  return new Date(lastWorn).toDateString() === new Date().toDateString()
}

// Device-local "YYYY-MM-DD" (NOT `.toISOString().slice(0, 10)`, which is the
// UTC date and can be a day off from the local calendar day near midnight in
// timezones behind/ahead of UTC) — used wherever a local calendar day needs
// to cross the wire as a Postgres `date` (e.g. use_streak_save's
// p_saved_date, see src/lib/utils/use-streak-saver.ts).
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
