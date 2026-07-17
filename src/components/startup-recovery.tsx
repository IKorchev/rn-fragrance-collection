import React from "react"
import { ActivityIndicator, View } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { EmptyState } from "@/components/shared/ui"

interface StartupRecoveryProps {
  retrying: boolean
  onRetry: () => void
}

// Shown in place of the (already-dismissed) native splash when startup
// genuinely stalls or the initial session check fails outright — see the
// stall timer / authError handling in src/app/_layout.tsx. Without this the
// app would otherwise sit on a blank screen indefinitely.
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
          title='Taking longer than usual to start'
          message='Check your connection and try again.'
          actionLabel='Retry'
          onAction={onRetry}
        />
      )}
    </View>
  )
}

export default StartupRecovery
