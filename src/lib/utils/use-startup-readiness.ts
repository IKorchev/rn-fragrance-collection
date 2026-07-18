import { useEffect, useState } from "react"
import * as SplashScreen from "expo-splash-screen"
import { useFonts, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces"
import useAuth from "@/contexts/auth-context"
import { reportError } from "@/lib/sentry"

// How long to wait before treating startup as genuinely stalled (vs. a
// normal cold-start delay) and offering a manual retry.
const STARTUP_STALL_MS = 8000

// One explicit phase instead of interacting booleans:
//   pending  → native splash stays up (normal cold start, or a stall window
//              that hasn't elapsed yet)
//   stalled  → recovery screen with a Retry button
//   retrying → recovery screen with a spinner (a manual retry is in flight)
type Phase = "pending" | "stalled" | "retrying"

// Startup gate for the root navigator: `ready` once fonts + the initial auth
// check resolve, `needsRecovery` when startup failed or stalled and the
// StartupRecovery screen should replace the (hidden) splash. Owns hiding the
// native splash — _layout.tsx's preventAutoHideAsync() keeps it up until
// either outcome.
export const useStartupReadiness = () => {
  const { authLoading, authError, retryAuthInit } = useAuth()
  // A font-load failure falls through to the system font rather than hanging
  // startup on typography.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold })
  const fontsReady = fontsLoaded || !!fontError
  // authError must gate readiness, not just authLoading — otherwise a
  // resolved-with-error session load reads as "ready" and falls through to
  // the signed-out stack instead of the recovery screen.
  const ready = !authLoading && fontsReady && !authError

  const [phase, setPhase] = useState<Phase>("pending")

  useEffect(() => {
    if (fontError) reportError(fontError, { flow: "load-fonts" })
  }, [fontError])

  // One stall timer covers both the initial load and every retry: entering
  // "retrying" re-runs this effect and arms a fresh window, so a stuck retry
  // lands back on the Retry button instead of spinning forever.
  useEffect(() => {
    if (ready || phase === "stalled") return
    const timer = setTimeout(() => setPhase("stalled"), STARTUP_STALL_MS)
    return () => clearTimeout(timer)
  }, [ready, phase])

  // A retry settles (success or failure) once authLoading drops — clear the
  // spinner. On failure authError keeps the recovery screen up, now showing
  // the Retry button again.
  useEffect(() => {
    if (!authLoading) setPhase((p) => (p === "retrying" ? "pending" : p))
  }, [authLoading])

  const needsRecovery = !!authError || phase !== "pending"

  useEffect(() => {
    if (ready || needsRecovery) SplashScreen.hideAsync().catch(() => {})
  }, [ready, needsRecovery])

  const retry = () => {
    setPhase("retrying")
    retryAuthInit()
  }

  return { ready, needsRecovery, retrying: phase === "retrying", retry }
}
