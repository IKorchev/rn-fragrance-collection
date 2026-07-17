import * as Sentry from "@sentry/react-native"
import Constants from "expo-constants"

// Crash/error reporting — fully inert (no init, no network calls) until
// EXPO_PUBLIC_SENTRY_DSN is set in .env/.env.local. See .env.example and
// docs/sentry.md for the dashboard/EAS setup this still needs.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
export const sentryEnabled = !!dsn

const expoConfig = Constants.expoConfig
const appVersion = expoConfig?.version ?? "0.0.0"
// iOS buildNumber is a string, Android versionCode a number — normalize to a
// single stable `dist` identifier Sentry can group releases by.
const buildNumber = String(expoConfig?.ios?.buildNumber ?? expoConfig?.android?.versionCode ?? "0")

export const initSentry = () => {
  if (!sentryEnabled) return
  Sentry.init({
    dsn,
    // No IP/device-name/user-email collection — see CLAUDE.md on user content.
    sendDefaultPii: false,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? "development" : "production"),
    release: `${expoConfig?.slug ?? "fragrance-collection"}@${appVersion}+${buildNumber}`,
    dist: buildNumber,
    debug: __DEV__,
    // Error tracking only for now — no perf/session-replay sampling configured.
    tracesSampleRate: 0,
  })
}

// Routes an otherwise-swallowed async failure to Sentry (no-ops when Sentry
// isn't configured) while always surfacing it in the dev console. Callers
// must only ever pass the error itself (or non-sensitive metadata like an
// RPC name) as `extra` — never user-entered content such as notes, ratings,
// or auth tokens.
export const reportError = (error: unknown, extra?: Record<string, unknown>) => {
  if (__DEV__) console.error(error)
  if (!sentryEnabled) return
  Sentry.captureException(error, extra ? { extra } : undefined)
}
