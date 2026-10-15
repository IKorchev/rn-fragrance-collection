---
name: ota-updates
description: Publish or debug over-the-air JS updates for this app — use when shipping a JS/asset-only fix, running "yarn ota:publish", reasoning about runtimeVersion/channels/branches, or touching use-app-updates.ts, app.config.js or scripts/preflight-ota.mjs.
---

# OTA updates (self-hosted xprem)

This app does **not** use EAS Update. It publishes to a self-hosted
[xprem](https://github.com/mercuretechnologies/xprem) server. Never run
`eas update` — it would publish to a host no build points at any more.

Full runbook — deployed topology, verification, rollback, server upgrades:
`docs/ota-self-hosted.md`.
For server, wiring, publish and MCP specifics, use the vendor skills:
`xprem-quickstart`, `xprem-configure-expo`, `xprem-publish`, `xprem-connect-mcp`.
They point at live docs — prefer those over any command cached here.

## Publishing

```bash
yarn ota:publish --branch production
yarn ota:publish --branch production --rollout-percentage 10   # staged
```

**Always go through `yarn ota:publish`, never `npx eoas publish` directly.**
`eoas` runs `expo export` with `EXPO_NO_DOTENV=1` and loads no `.env` files, but
this app reads nine `EXPO_PUBLIC_*` values at bundle time. A bare `eoas publish`
inlines `undefined` for all of them and succeeds, shipping an update whose
Supabase client was built from `undefined!` (`src/lib/supabase.ts` asserts both
with `!`). `yarn ota:publish` runs the documented `dotenv -e .env.local -- eoas
publish`, gated behind `scripts/preflight-ota.mjs`, which refuses to publish when
a load-bearing variable is missing. Pass the branch explicitly:
`yarn ota:publish --branch production`.

Needs `XPREM_BASE_URL` and `EOO_TOKEN` in `.env.local`. `eoas` also refuses a
dirty git tree, untracked files included.

## Config

`app.config.js` owns the `updates` block and extends `app.json` (which keeps
everything else, including `runtimeVersion`). Two guards live there:

- Throws if `XPREM_BASE_URL` is unset on a signing build, so a release can never
  embed an unreachable update URL.
- Throws if `DISABLE_CODE_SIGNING` is set alongside `EAS_BUILD`. That variable is
  set via `cross-env` on `yarn start`/`android`/`ios`/`web`, because
  the signing private key stays server-side and a dev-client manifest cannot be
  signed. A release built with it set would apply updates **without verifying
  signatures** — never defeat this guard.

`expo-channel-name` must stay a literal string in `requestHeaders`.
`expo-updates` only sends headers declared at build time, and an unset
`process.env` value silently drops the key, which 400s every update check.

## Delivery rules worth remembering

- Runtime version must match the installed binary exactly or the update is
  silently never delivered. Policy is `appVersion`, so it tracks `version` in
  `app.json` — bump it for any native change, as before.
- A build is bound to a **channel**; an update is published to a **branch**. The
  dashboard maps one to the other, and nothing ships until that mapping exists.
- Rolling back means **republishing** the older update, not re-pointing at it:
  `expo-updates` only moves to an update with a *newer* `commitTime`
  (`LoaderSelectionPolicyFilterAware`). The alternative is the
  `rollBackToEmbedded` directive, which returns installs to the store bundle.

`src/lib/utils/use-app-updates.ts` checks on launch and on every foreground,
then offers a restart via the shared toast. It no-ops under `__DEV__`/Expo Go.
Because `fallbackToCacheTimeout: 0`, a failed check is never an outage — which
is what makes scale-to-zero hosting acceptable.
