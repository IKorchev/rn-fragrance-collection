import { useCallback, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import useAuth from "@/contexts/auth-context"

const dismissedKey = (userId: string) => `onboarding:dismissed:${userId}`
const pickerTriedKey = (userId: string) => `onboarding:picker-tried:${userId}`

// Called from picker.tsx's mount effect — "tried the picker" has no
// server-side signal (opening the modal isn't a collection write), so it's a
// local per-user flag instead of derived state like the other two steps.
export const markPickerTried = (userId: string | undefined) => {
  if (userId) AsyncStorage.setItem(pickerTriedKey(userId), "1")
}

export interface OnboardingStep {
  key: "add" | "wear" | "picker"
  label: string
  description: string
  done: boolean
  // false while a step's prerequisite (an existing collection) isn't met yet
  enabled: boolean
}

// Drives the "Getting started" checklist (src/components/onboarding-checklist.tsx,
// shown on the Collection tab) and its re-entry point (Profile tab). Steps
// 1-2 are derived from real collection state, so they can never go stale or
// desync from what the user actually did; step 3 (picker) is the local flag
// above. `dismissed` only hides the inline checklist — the Profile tab entry
// point stays available (via `resume`) until all 3 steps are actually done.
export const useOnboarding = () => {
  const { user, userCollection } = useAuth()
  const userId = user?.id
  const [dismissed, setDismissed] = useState(false)
  const [pickerTried, setPickerTried] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoaded(false)
    Promise.all([AsyncStorage.getItem(dismissedKey(userId)), AsyncStorage.getItem(pickerTriedKey(userId))]).then(
      ([d, p]) => {
        if (cancelled) return
        setDismissed(d === "1")
        setPickerTried(p === "1")
        setLoaded(true)
      }
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const dismiss = useCallback(() => {
    if (!userId) return
    setDismissed(true)
    AsyncStorage.setItem(dismissedKey(userId), "1")
  }, [userId])

  // Re-enters the checklist after a Skip (Profile tab's "Getting started" row)
  const resume = useCallback(() => {
    if (!userId) return
    setDismissed(false)
    AsyncStorage.removeItem(dismissedKey(userId))
  }, [userId])

  const hasCollection = userCollection.length > 0
  const hasWorn = userCollection.some((f) => f.times_worn > 0)

  const steps: OnboardingStep[] = [
    {
      key: "add",
      label: "Add your first fragrance",
      description: "Search the catalog, or add one by hand if we're missing it.",
      done: hasCollection,
      enabled: true,
    },
    {
      key: "wear",
      label: "Log your first wear",
      description: "Tap Wear next time you spritz something on.",
      done: hasWorn,
      enabled: hasCollection,
    },
    {
      key: "picker",
      label: "Try the picker",
      description: "Can't decide? Let the picker do the sniffing for you.",
      done: pickerTried,
      enabled: hasCollection,
    },
  ]

  const allDone = steps.every((s) => s.done)

  return { loaded, dismissed, dismiss, resume, steps, allDone }
}
