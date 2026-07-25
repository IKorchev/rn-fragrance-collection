import React, { createContext, useContext, useMemo, type ReactNode } from "react"
import {
  DEFAULT_LOCALE,
  translate,
  formatNumber as formatNumberFor,
  formatDate as formatDateFor,
  type Locale,
} from "@/lib/i18n/translate"

interface LocaleContextValue {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
}

const LocaleContext = createContext<LocaleContextValue>({} as LocaleContextValue)

const useLocale = () => useContext(LocaleContext)

// The app ships English only, so there's no stored preference or picker — this
// exists to keep every screen reading copy through t() rather than inline
// strings, which is what makes adding a locale later a dictionary-only change.
export const LocaleContextProvider = ({ children }: { children: ReactNode }) => {
  const locale = DEFAULT_LOCALE

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      formatNumber: (value, options) => formatNumberFor(locale, value, options),
      formatDate: (date, options) => formatDateFor(locale, date, options),
    }),
    [locale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export default useLocale
