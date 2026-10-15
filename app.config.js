// Extends app.json — Expo passes its parsed contents in as `config`, and what
// this function returns is the resolved config. Only the `updates` block lives
// here; everything else stays in app.json. It cannot stay static JSON because
// the dev-client guard and the channel literal below both need to be computed.
//
// See docs/ota-self-hosted.md for the xprem server this points at.

// The signing private key never leaves the xprem server in control-plane mode,
// so `expo start --dev-client` cannot sign a development manifest and errors
// out. The dev scripts in package.json set this; a release build must NEVER
// have it set, or it ships a binary that applies updates without verifying
// signatures — i.e. anyone who can answer the update URL owns the app.
const disableCodeSigning = !!process.env.DISABLE_CODE_SIGNING

if (disableCodeSigning && process.env.EAS_BUILD) {
  throw new Error("DISABLE_CODE_SIGNING must never be set on an EAS build")
}

// Fails the export/build rather than silently baking in an unreachable host.
// Dev builds skip the check — they talk to Metro, not to xprem.
const baseUrl = process.env.XPREM_BASE_URL
if (!baseUrl && !disableCodeSigning) {
  throw new Error(
    "XPREM_BASE_URL is not set — a release build would embed an unreachable update URL. " +
      "Set it in .env.local (local builds) or as an EAS env var. See docs/ota-self-hosted.md.",
  )
}

// expo-updates only sends headers that were declared at build time, and a key
// whose value is undefined is dropped silently — a build that stops sending
// expo-channel-name gets a 400 on every update check. Both branches here are
// literals so the key can never go missing.
const channel = process.env.XPREM_CHANNEL === "preview" ? "preview" : "production"

// The xprem dashboard app id (App Info). Distinct from the old EAS projectId
// still in app.json's extra.eas — that one is now only an identifier for other
// Expo tooling and has no part in update delivery.
const APP_ID = "2d22eb15-8b4a-48df-abcf-fab2af5e91c2"

module.exports = ({ config }) => ({
  ...config,
  updates: {
    url: `${baseUrl ?? "http://localhost:3000"}/manifest`,
    enabled: true,
    fallbackToCacheTimeout: 0,
    requestHeaders: {
      "expo-channel-name": channel,
      "expo-app-id": APP_ID,
      // Declared-but-empty on purpose: branch surfing overrides it at runtime,
      // and a runtime override is only possible for headers present at build time.
      "xprem-branch": "",
    },
    codeSigningCertificate: disableCodeSigning ? undefined : "./certs/certificate.pem",
    codeSigningMetadata: disableCodeSigning
      ? undefined
      : { keyid: "main", alg: "rsa-v1_5-sha256" },
  },
})
