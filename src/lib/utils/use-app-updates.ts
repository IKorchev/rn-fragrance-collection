import { useEffect } from "react"
import { AppState } from "react-native"
import * as Updates from "expo-updates"
import { translateDefault } from "@/lib/i18n/translate"
import useToast from "@/contexts/toast-context"
import { reportError } from "@/lib/sentry"

// Checks for an OTA update on launch and whenever the app returns to the
// foreground, then offers a restart via the shared toast. `fallbackToCacheTimeout: 0`
// (app.config.js) means launch never blocks on this — an update found here was
// missed by the launch-time check and only applies once the user restarts.
// It also means a self-hosted update server being unreachable is never an
// outage: the check just fails and the app runs the bundle it already has.
// No-ops in dev/Expo Go, where expo-updates isn't backed by a real launch.
export const useAppUpdates = () => {
  const { showToast } = useToast()

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return

    const checkAndPrompt = async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync()
        if (!isAvailable) return
        await Updates.fetchUpdateAsync()
        showToast({
          message: translateDefault("updates.ready"),
          actionLabel: translateDefault("updates.restart"),
          onAction: () => Updates.reloadAsync(),
          duration: 8000,
        })
      } catch (error) {
        // Offline, or the update host is unreachable — fine, next check will retry
        reportError(error, { flow: "ota-update-check" })
      }
    }

    checkAndPrompt()
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") checkAndPrompt()
    })
    return () => subscription.remove()
  }, [])
}
