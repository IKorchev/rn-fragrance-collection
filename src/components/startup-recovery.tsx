import React from "react"
import { ActivityIndicator, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { EmptyState } from "@/components/shared/ui"
import { translateDefault as t } from "@/lib/i18n/translate"

interface StartupRecoveryProps {
  retrying: boolean
  onRetry: () => void
}

// Shown in place of the (already-dismissed) native splash when startup
// genuinely stalls or the initial session check fails outright — see the
// stall timer / authError handling in src/lib/utils/use-startup-readiness.ts.
// Without this the app would otherwise sit on a blank screen indefinitely.
const StartupRecovery = ({ retrying, onRetry }: StartupRecoveryProps) => {
  const { viewColors, accentColors } = useTheme()

  return (
    <View
      accessible
      accessibilityRole='alert'
      className={`flex-1 items-center justify-center ${viewColors.background}`}>
      {retrying ? (
        <ActivityIndicator size='large' color={getColor(accentColors)} />
      ) : (
        <EmptyState
          icon='wifi-off'
          title={t("startup.title")}
          message={t("collection.loadErrorMessage")}
          actionLabel={t("common.retry")}
          onAction={onRetry}
        />
      )}
    </View>
  )
}

export default StartupRecovery
