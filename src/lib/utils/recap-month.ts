// Shared "YYYY-MM" month-key helpers for the monthly recap feature
// (src/app/monthly-recap.tsx + use-monthly-recap-prompt.ts) — kept in one
// place so both agree on what a month boundary means (device-local calendar
// month, [start, end) half-open range).
export interface MonthRange {
  key: string // "YYYY-MM"
  start: Date // local midnight, first day of the month
  end: Date // local midnight, first day of the NEXT month (exclusive)
}

export const monthKeyFor = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

export const monthRangeForKey = (key: string): MonthRange => {
  const [yearStr, monthStr] = key.split("-")
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  return {
    key,
    start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(year, monthIndex + 1, 1, 0, 0, 0, 0),
  }
}

// Device-local previous calendar month relative to `now` — the recap
// screen's default when opened without a `month` param.
export const previousMonthKey = (now: Date = new Date()): string =>
  monthKeyFor(new Date(now.getFullYear(), now.getMonth() - 1, 1))

export const isInRange = (isoDate: string, range: Pick<MonthRange, "start" | "end">): boolean => {
  const d = new Date(isoDate)
  return d >= range.start && d < range.end
}

// Longest run of consecutive worn calendar days found within a slice of
// events — an adaptation of computeStreak's "consecutive day" logic
// (src/lib/gamification/index.ts) for a bounded window instead of a
// walk-backward-from-now count, so month recaps can show the best streak
// achieved during that specific month rather than the streak active today.
export const bestStreakWithin = (events: { worn_at: string }[]): number => {
  const dayTimestamps = Array.from(new Set(events.map((e) => new Date(e.worn_at).toDateString())))
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b)

  if (dayTimestamps.length === 0) return 0

  const DAY_MS = 24 * 60 * 60 * 1000
  let best = 1
  let current = 1
  for (let i = 1; i < dayTimestamps.length; i++) {
    current = dayTimestamps[i] - dayTimestamps[i - 1] === DAY_MS ? current + 1 : 1
    if (current > best) best = current
  }
  return best
}
