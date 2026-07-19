import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import type { GamificationState } from "@/lib/gamification"

const snapshotKey = (userId: string) => `gamification:last-seen:${userId}`

interface Snapshot {
  level: number
  earnedBadgeIds: string[]
}

// Module-level, not AsyncStorage-backed — this is what enforces "at most one
// toast per app session" even if the hook remounts (tab focus churn, screen
// re-navigation). It naturally resets on the next app cold start.
let notifiedThisSession = false

// Detects level-ups and newly-earned badges by comparing the current
// gamification state against a persisted last-seen snapshot (same
// AsyncStorage-per-user pattern as use-onboarding.ts), and fires at most one
// toast per app session — level-up wins if both happened since last seen.
// Mount this once near the top of the signed-in tree (see (tabs)/_layout.tsx)
// so it fires regardless of which tab is active.
export const useGamificationAlerts = (state: GamificationState) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const userId = user?.id
  // undefined = not loaded yet, null = loaded but no prior snapshot exists
  const [prevSnapshot, setPrevSnapshot] = useState<Snapshot | null | undefined>(undefined)

  useEffect(() => {
    setPrevSnapshot(undefined)
    if (!userId) return
    let cancelled = false
    AsyncStorage.getItem(snapshotKey(userId)).then((raw) => {
      if (cancelled) return
      setPrevSnapshot(raw ? (JSON.parse(raw) as Snapshot) : null)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!userId || prevSnapshot === undefined) return

    const earnedBadgeIds = state.badges.filter((b) => b.earned).map((b) => b.id)
    const next: Snapshot = { level: state.level, earnedBadgeIds }
    const changed =
      !prevSnapshot ||
      prevSnapshot.level !== next.level ||
      prevSnapshot.earnedBadgeIds.length !== next.earnedBadgeIds.length

    if (!changed) return

    // prevSnapshot === null means this is the very first snapshot ever
    // written for this user — that's a baseline, not a "change", so no toast.
    if (prevSnapshot && !notifiedThisSession) {
      if (next.level > prevSnapshot.level) {
        notifiedThisSession = true
        showToast({ message: t("gamification.toasts.levelUp", { title: t(state.levelTitle) }) })
      } else {
        const newBadgeId = earnedBadgeIds.find((id) => !prevSnapshot.earnedBadgeIds.includes(id))
        if (newBadgeId) {
          notifiedThisSession = true
          showToast({
            message: t("gamification.toasts.badgeUnlocked", {
              name: t(`gamification.badges.${newBadgeId}.name`),
            }),
          })
        }
      }
    }

    setPrevSnapshot(next)
    AsyncStorage.setItem(snapshotKey(userId), JSON.stringify(next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.level, state.levelTitle, state.badges, prevSnapshot])
}

export default useGamificationAlerts
