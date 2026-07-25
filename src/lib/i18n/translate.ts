import type { Dictionary } from "./types"
import en from "./locales/en"

// English-only for now. The lookup/plural/interpolation machinery below is
// locale-parameterised on purpose so adding a second locale is just a new
// dictionary file plus an entry here — nothing else in the app changes.
export type Locale = "en"

export const SUPPORTED_LOCALES: Locale[] = ["en"]
export const DEFAULT_LOCALE: Locale = "en"

const dictionaries: Record<Locale, Dictionary> = { en }

const lookup = (dict: Dictionary, path: string): string | undefined => {
  const parts = path.split(".")
  let node: Dictionary | string = dict
  for (const part of parts) {
    if (typeof node !== "object" || node === null || !(part in node)) return undefined
    node = node[part]
  }
  return typeof node === "string" ? node : undefined
}

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
    const value = params[token]
    return value === undefined ? match : String(value)
  })
}

// Falls back to "other" if Intl.PluralRules can't resolve a locale (should
// never happen for our supported list, but keeps this from ever throwing).
const pluralCategory = (locale: Locale, count: number): string => {
  try {
    return new Intl.PluralRules(locale).select(count)
  } catch {
    return count === 1 ? "one" : "other"
  }
}

// Dot-path lookup with i18next-style "_one"/"_other" plural suffixes, picked
// via params.count. A missing key degrades to the raw key rather than throwing
// (logged in dev so gaps get noticed).
export const translate = (
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string => {
  const count = typeof params?.count === "number" ? params.count : undefined
  const dict = dictionaries[locale]

  let resolved =
    count !== undefined
      ? lookup(dict, `${key}_${pluralCategory(locale, count)}`) ?? lookup(dict, `${key}_other`)
      : undefined
  resolved ??= lookup(dict, key)

  if (resolved === undefined) {
    if (__DEV__) console.warn(`[i18n] Missing translation for key "${key}" (locale "${locale}")`)
    resolved = key
  }

  return interpolate(resolved, params)
}

export const formatNumber = (
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return String(value)
  }
}

export const formatDate = (
  locale: Locale,
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch {
    return date.toDateString()
  }
}
