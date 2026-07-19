import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import { weekKeyFor, type ActiveQuest } from "@/lib/gamification"

const snapshotKey = (userId: string, weekKey: string) => `gamification:quests-last-seen:${userId}:${weekKey}`

// Module-level, not AsyncStorage-backed — same "at most one toast per app
// session" guard as use-gamification-alerts.ts, so remounts (tab churn)
// don't re-fire.
let notifiedThisSession = false

// Detects newly-completed weekly quests by comparing against a persisted
// per-week "already notified" snapshot, and fires at most one
// "Quest complete: <title> +50 XP" toast per app session. Keyed by
// weekKeyFor() (ISO year+week) rather than just userId — the active quest
// ids reset every week, and a quest id can recur in a later week (56
// possible 3-of-8 combos), so a stale snapshot from a previous occurrence of
// the same id must not suppress a genuine re-completion this week.
export const useQuestAlerts = (quests: ActiveQuest[]) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const userId = user?.id
  const weekKey = weekKeyFor()
  // undefined = not loaded yet, null = loaded but no snapshot exists for this week
  const [prevCompleted, setPrevCompleted] = useState<string[] | null | undefined>(undefined)

  useEffect(() => {
    setPrevCompleted(undefined)
    if (!userId) return
    let cancelled = false
    AsyncStorage.getItem(snapshotKey(userId, weekKey)).then((raw) => {
      if (cancelled) return
      setPrevCompleted(raw ? (JSON.parse(raw) as string[]) : null)
    })
    return () => {
      cancelled = true
    }
  }, [userId, weekKey])

  useEffect(() => {
    if (!userId || prevCompleted === undefined || quests.length === 0) return

    const completedIds = quests.filter((q) => q.completed).map((q) => q.id)
    const changed = !prevCompleted || completedIds.length !== prevCompleted.length

    if (changed) {
      // prevCompleted === null means this is the first check this week —
      // that's a baseline, not a "change", so no toast even if some quests
      // already show complete (e.g. the app was closed when they finished).
      if (prevCompleted && !notifiedThisSession) {
        const newlyCompletedId = completedIds.find((id) => !prevCompleted!.includes(id))
        if (newlyCompletedId) {
          const quest = quests.find((q) => q.id === newlyCompletedId)!
          notifiedThisSession = true
          showToast({
            message: t("gamification.quests.toastComplete", {
              title: t(`gamification.quests.${newlyCompletedId}.title`),
              xp: quest.xpReward,
            }),
          })
        }
      }
      setPrevCompleted(completedIds)
      AsyncStorage.setItem(snapshotKey(userId, weekKey), JSON.stringify(completedIds))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, weekKey, quests, prevCompleted])
}

export default useQuestAlerts
