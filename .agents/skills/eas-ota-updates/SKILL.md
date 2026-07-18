---
name: eas-ota-updates
description: Publish or debug over-the-air JS updates with EAS Update (expo-updates) — use when shipping a JS/asset-only fix, running "eas update", reasoning about runtimeVersion/channels, or touching use-app-updates.ts.
---

# OTA updates (EAS Update)

`expo-updates` ships JS/asset-only fixes without a store review cycle. `app.json`'s `updates.url` points at this project's EAS Update host and `runtimeVersion.policy: "appVersion"` means an update is only offered to installs whose native app version matches exactly — bump `version` (and rebuild) for any change that touches native code. `eas.json`'s `build.production`/`build.preview` profiles each declare a `channel` (`production`/`preview`) that maps builds to the branch `eas update --branch <channel>` publishes to; `development` has no channel since dev-client builds run against the local Metro server, not a hosted update. `src/lib/utils/use-app-updates.ts` (wired into `RootNavigator` in `src/app/_layout.tsx`, ahead of the `authLoading` gate so it isn't tied to sign-in state) checks for an update on launch and on every foreground, then offers a restart through the shared toast — it no-ops under `__DEV__`/Expo Go where `expo-updates` isn't backed by a real published launch. Publish with `eas update --branch production --message "..."`.
