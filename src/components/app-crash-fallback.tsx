import React from "react"
import { Text, TouchableOpacity, View, useColorScheme } from "react-native"

interface AppCrashFallbackProps {
  error: unknown
  resetError: () => void
}

// Last-resort UI for Sentry.ErrorBoundary in src/app/_layout.tsx, which wraps
// the entire provider tree. Deliberately self-contained — no useTheme() or
// other app context — since the crash may have originated inside one of
// those providers, and this component must still render.
const AppCrashFallback = ({ error, resetError }: AppCrashFallbackProps) => {
  const dark = useColorScheme() === "dark"
  const bg = dark ? "#09090b" : "#ffffff"
  const fg = dark ? "#f4f4f5" : "#18181b"
  const muted = dark ? "#a1a1aa" : "#71717a"
  const accent = dark ? "#34d399" : "#059669"
  const devMessage = __DEV__ && error instanceof Error ? error.message : null

  return (
    <View
      accessible
      accessibilityRole='alert'
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        paddingHorizontal: 32,
      }}>
      <Text style={{ color: fg, fontSize: 20, fontWeight: "700", textAlign: "center" }}>
        Something went wrong
      </Text>
      <Text style={{ color: muted, fontSize: 15, textAlign: "center", marginTop: 8 }}>
        Fragrance Collection ran into a problem and couldn't continue. Your collection is safe.
      </Text>
      {devMessage && (
        <Text style={{ color: muted, fontSize: 12, textAlign: "center", marginTop: 12 }}>
          {devMessage}
        </Text>
      )}
      <TouchableOpacity
        onPress={resetError}
        accessibilityRole='button'
        accessibilityLabel='Try again'
        style={{
          backgroundColor: accent,
          paddingVertical: 12,
          paddingHorizontal: 32,
          borderRadius: 999,
          marginTop: 24,
        }}>
        <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 16 }}>Try again</Text>
      </TouchableOpacity>
    </View>
  )
}

export default AppCrashFallback
