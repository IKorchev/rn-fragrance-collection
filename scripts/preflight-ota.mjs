#!/usr/bin/env node
// Preflight for `yarn ota:publish`. Runs under dotenv-cli, so .env.local is
// already in process.env by the time this executes.
//
// Why this exists at all: eoas runs `expo export` with EXPO_NO_DOTENV=1, and
// this app reads the values below at bundle time. A publish missing one of them
// succeeds — it just inlines `undefined`. src/lib/supabase.ts asserts both
// Supabase values with `!`, so nothing throws at build and every install that
// takes the update quietly loses its backend. Fail here instead.

const REQUIRED = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
  "XPREM_BASE_URL",
  "EOO_TOKEN",
]

// Absent => that feature is silently inert in the shipped update.
const OPTIONAL = [
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID",
  "EXPO_PUBLIC_SENTRY_DSN",
]

const missing = REQUIRED.filter((key) => !process.env[key])
const degraded = OPTIONAL.filter((key) => !process.env[key])

if (degraded.length > 0) {
  console.warn(`\n⚠  Not set — inert in this update:\n${degraded.map((k) => `    ${k}`).join("\n")}\n`)
}

if (missing.length > 0) {
  console.error(
    `\n✖ Refusing to publish — read at bundle time but not set:\n` +
      `${missing.map((k) => `    ${k}`).join("\n")}\n\n` +
      `  See docs/ota-self-hosted.md.\n`,
  )
  process.exit(1)
}

console.log(`✓ env ok — publishing against ${process.env.XPREM_BASE_URL}`)
