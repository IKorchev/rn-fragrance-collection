---
name: maestro-e2e
description: Run or write Maestro E2E flows to verify the app on the Android emulator — use whenever verifying changes on-device, running "maestro test", authoring/debugging a flow in .maestro/, or a flow fails.
---

# Maestro E2E flows (`.maestro/`)

Maestro (`maestro` on PATH; Android via adb) drives the app on the local emulator for real-device verification. `maestro test .maestro` runs the whole suite (`.maestro/config.yaml` globs `flows/*.yaml`; `maestro test .maestro/flows/<name>.yaml` runs one). Prerequisites, in order:

1. **Emulator running** — `Pixel_10_Pro_XL` AVD, boot with `emulator -avd Pixel_10_Pro_XL` (`%LOCALAPPDATA%\Android\Sdk\emulator\`), wait for `adb shell getprop sys.boot_completed` = 1. The dev-client build (`com.korchev.fragrancecollection`) must already be installed (`yarn android` once).
2. **Metro on 8081** — check `http://localhost:8081/status` FIRST; it is usually already running from the user's own dev session. Only start `expo start` if it isn't.
3. **Signed-in session on the device** — Google sign-in cannot be automated (and Codex must not perform sign-ins), so flows assume a persisted Supabase session in AsyncStorage. **Never use `clearState`** in a flow: it wipes the session and bricks the whole suite until the user manually signs in again.

Flow conventions (learned the hard way — keep following them):
- Every flow starts with `runFlow: ../subflows/launch-dev-client.yaml`, which deep-links the dev client straight into Metro (`com.korchev.fragrancecollection://expo-development-client/?url=<encoded Metro URL>`, `10.0.2.2` = host localhost) — this skips the dev-launcher home screen — then waits for the "Discover" tab label and taps it, because the app restores the last-viewed tab and flows need a deterministic start.
- **Don't use `hideKeyboard`** — on Android it falls back to a back-press, which exits the app if the keyboard already dismissed itself. Assert on content that renders above the keyboard instead.
- If typed text mysteriously never reaches an input (Gboard opens its customization panel instead), reset it with `adb shell am force-stop com.google.android.inputmethod.latin` and re-run.
- Icon-only controls carry `testID`s (`wear-button`, `picker-fab`, `picker-close`, `picker-lever`, `picker-wear-button`) — RN exposes `testID` as the Android resource-id, matched with Maestro's `id:` selector (`Card.ActionButton` forwards a `testID` prop). Give any new icon-only control a `testID` instead of tapping by coordinates. The picker lever is pulled with `swipe: { from: { id: picker-lever }, direction: DOWN }`; Maestro's implicit settle-wait absorbs the whole spin animation, so assert on the post-spin state, not on mid-spin UI.
- Failure artifacts (screenshot + hierarchy + logs) land in `~/.maestro/tests/<timestamp>/` — read the screenshot first when a flow fails.
- Wear/undo actions mutate real Supabase data and the one-wear-per-calendar-day rule makes stray wears costly — a flow that taps a wear button must always undo it in the same flow, and prefer read-only assertions everywhere else.
