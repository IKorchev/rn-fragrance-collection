# Home-screen widgets — feasibility (not implemented)

Investigated as part of the sharing/localization/social-lite/widgets work.
**No widget code was added.** Every viable path requires new native modules,
a new config plugin, and — for iOS — a brand-new Xcode app-extension target
and entitlement, which cross the "consequential native boundary" this repo's
agent instructions call out explicitly. This doc exists so the native work
can be scoped and approved separately, not folded silently into a JS change.

## Why nothing is JS-only here

Widgets (Android App Widgets, iOS WidgetKit) render outside the RN JS
runtime, in a separate process the OS spins up on its own schedule. There is
no Expo/React Native API that reaches that surface from pure JS — every
existing solution ships real native (Kotlin/Swift) code compiled into the
binary. Concretely, that means for *both* platforms:

- A new native module and/or Expo **config plugin** (native code + build-time
  manifest/Xcode project edits) — not currently in this repo.
- A full **dev-client rebuild** (`expo run:android` / `expo run:ios`), same
  category as the `react-native-purchases`/`react-native-google-mobile-ads`
  rebuild requirement already documented in CLAUDE.md.
- An `app.json` **`version` bump** (this project's `runtimeVersion.policy` is
  `"appVersion"` — an OTA update reaching a build without the new native code
  would crash at bundle eval, same reasoning as the Pro/ads modules).
- Widget UI changes ship only via a new **store build**, never EAS
  Update/OTA — a real workflow change from how the rest of the app ships.

## Android — Jetpack Glance / AppWidgetProvider

- No first-party Expo widget API exists (SDK 57). The practical path is the
  community package `react-native-android-widget` (actively maintained,
  renders Android widgets from React components at build time) or a
  hand-written Kotlin `AppWidgetProvider` + Glance layout.
- Either way requires: a config plugin that registers a widget receiver in
  `AndroidManifest.xml` (new manifest surface this repo doesn't have), a
  small XML/Kotlin widget layout, and a **data bridge** — something has to
  write "today's scent" (name + cached image) into `SharedPreferences`/
  `DataStore` whenever `incrementWear`/`getNewFrag` fire in `AuthContext`, so
  the widget process can read it without the RN app running. That bridge is
  itself new native surface, before any widget UI exists.
- A "wear it from the widget" action button is out of scope for a first cut:
  it would need the widget to trigger app logic (an RPC call) without the JS
  runtime active, which means a headless JS task or an Android-side network
  call — real added complexity. Recommend a **deep-link-only** widget first
  (tap → opens the app to the relevant screen), no in-widget mutation.

## iOS — WidgetKit / SwiftUI extension

- WidgetKit widgets are a separate **App Extension target** in Xcode, written
  in SwiftUI — not something a config plugin can synthesize purely from JS.
  The realistic option is `@bacons/apple-targets` (a real community Expo
  config plugin that scaffolds extension targets, including widgets, from
  Swift source checked into the repo) or manually maintaining an Xcode
  target outside the managed workflow.
- Requires an **App Group entitlement** (to share "today's scent" state
  between the main app and the widget extension via a shared container/
  `UserDefaults`) and a matching provisioning profile change in the Apple
  Developer portal.
- Per CLAUDE.md, **no iOS build exists yet for this project at all** — an iOS
  widget would be bundled with standing up the very first iOS native build,
  not just adding an extension to an existing one. That's materially more
  native-side risk than the Android path.

## Recommendation if this gets approved later

1. Android first, deep-link-only widget ("today's scent" card → opens the
   app). Lower cost, no new entitlement, reuses the existing Android dev
   client.
2. A small native bridge (Android `SharedPreferences` write after
   `incrementWear`/`getNewFrag`) — the only new "logic," the rest is
   presentation.
3. iOS only after a first iOS build exists independently of widgets — treat
   "ship an iOS build" and "add an iOS widget" as two separate approvals.

## Exact native changes that need explicit sign-off before any of this starts

- New dependency + config plugin: `react-native-android-widget` and/or
  `@bacons/apple-targets`.
- New `AndroidManifest.xml` widget-receiver entries (Android config plugin
  output).
- New iOS App Extension target, App Group entitlement, and provisioning
  profile (iOS only).
- `app.json` `version` bump (native module addition, same rule as the
  existing Pro/ads modules).
- A dev-client rebuild on both platforms — and, for iOS, the project's first
  native build ever.
- A standing workflow change: widget UI/logic changes require a store
  release, not an OTA `eas update`.
