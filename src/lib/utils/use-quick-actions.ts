import { useEffect } from "react"
import * as QuickActions from "expo-quick-actions"
import { useQuickActionRouting, type RouterAction } from "expo-quick-actions/router"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { reportError } from "@/lib/sentry"

// Home-screen long-press shortcut straight into the picker. Mount in the
// signed-in tabs layout: useQuickActionRouting navigates, so it can't live in
// the root layout. Offered only while there's something to pick from, and
// cleared on sign-out (unmount) so a signed-out icon doesn't advertise it
export const useQuickActions = () => {
  const { visibleSortedCollection } = useAuth()
  const { t } = useLocale()
  const hasCollection = visibleSortedCollection.length > 0

  useQuickActionRouting()

  useEffect(() => {
    const items: RouterAction[] = hasCollection
      ? [{ id: "pick", title: t("quickActions.pick"), icon: "shuffle", params: { href: "/picker" } }]
      : []
    QuickActions.setItems(items).catch((error) => reportError(error, { flow: "quick-actions" }))
  }, [hasCollection, t])

  useEffect(
    () => () => {
      QuickActions.setItems([]).catch(() => {})
    },
    []
  )
}

export default useQuickActions
