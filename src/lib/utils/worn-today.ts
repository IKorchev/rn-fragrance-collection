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
