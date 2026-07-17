import { useCallback, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "recent-searches"
const MAX_ENTRIES = 8

// Device-local recent search terms for the catalog search tab — most-recent-
// first, case-insensitive de-duped, capped at MAX_ENTRIES. Not user-scoped
// (AsyncStorage is already per-device/per-install, and search terms aren't
// sensitive), matching theme-context's plain get/set-on-change convention.
export const useRecentSearches = () => {
  const [terms, setTerms] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) setTerms(parsed)
        } catch {
          // corrupt/old value — ignore, start fresh
        }
      }
    })
  }, [])

  const persist = (next: string[]) => {
    setTerms(next)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const add = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    setTerms((current) => {
      const deduped = current.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())
      const next = [trimmed, ...deduped].slice(0, MAX_ENTRIES)
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clear = useCallback(() => persist([]), [])

  return { terms, add, clear }
}
