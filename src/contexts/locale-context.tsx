import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  SUPPORTED_LOCALES,
  detectDeviceLocale,
  translate,
  formatNumber as formatNumberFor,
  formatDate as formatDateFor,
  type Locale,
} from "@/lib/i18n/translate"

// "system" re-detects the device locale on every app start (and whenever the
// user picks it back in the language row); an explicit Locale pins it.
export type LocalePreference = "system" | Locale

const LOCALE_STORAGE_KEY = "locale-preference"

interface LocaleContextValue {
  locale: Locale
  localePreference: LocalePreference
  setLocalePreference: (pref: LocalePreference) => void
  supportedLocales: Locale[]
  t: (key: string, params?: Record<string, string | number>) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
}

const LocaleContext = createContext<LocaleContextValue>({} as LocaleContextValue)

const useLocale = () => useContext(LocaleContext)

export const LocaleContextProvider = ({ children }: { children: ReactNode }) => {
  // Same pattern as ThemeContextProvider: render immediately with the default,
  // patch in the stored preference once AsyncStorage resolves (no loading gate).
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>("system")

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((stored) => {
      if (stored === "system" || (SUPPORTED_LOCALES as string[]).includes(stored ?? "")) {
        setLocalePreferenceState(stored as LocalePreference)
      }
    })
  }, [])

  const setLocalePreference = (pref: LocalePreference) => {
    setLocalePreferenceState(pref)
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, pref)
  }

  const locale = localePreference === "system" ? detectDeviceLocale() : localePreference

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      localePreference,
      setLocalePreference,
      supportedLocales: SUPPORTED_LOCALES,
      t: (key, params) => translate(locale, key, params),
      formatNumber: (value, options) => formatNumberFor(locale, value, options),
      formatDate: (date, options) => formatDateFor(locale, date, options),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, localePreference]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export default useLocale
