# Sentry setup

Crash/error reporting is wired up in code (`src/lib/sentry.ts`, `Sentry.ErrorBoundary`
in `src/app/_layout.tsx`) but stays completely inert — no init call, no native
SDK activity — until `EXPO_PUBLIC_SENTRY_DSN` is set. This doc covers the
external setup still needed to turn it on and get readable (symbolicated)
stack traces on release builds.

## 1. Create the Sentry project

1. Sign in at sentry.io (or your self-hosted instance) and create a project
   for **React Native**.
2. Copy the DSN from *Project Settings → Client Keys (DSN)* and note the
   **organization slug** and **project slug** (both visible in the project
   URL: `sentry.io/organizations/<org>/projects/<project>/`).

## 2. Client-side reporting (EXPO_PUBLIC_SENTRY_DSN)

Add to `.env` (or `.env.local` for a machine-local override):

```
EXPO_PUBLIC_SENTRY_DSN=<your DSN>
```

That's the only value required for error reporting to start working —
`initSentry()` in `src/lib/sentry.ts` picks it up automatically, sets
`environment` (dev/prod, override with `EXPO_PUBLIC_SENTRY_ENVIRONMENT`) and a
`release`/`dist` derived from `app.json`'s `version` + platform build number.
Rebuild the dev client (`yarn android`/`yarn ios`) after adding it — env vars
are inlined at build time.

## 3. Release source-map upload (EAS builds)

The `@sentry/react-native/expo` config plugin (already in `app.json`) and
`getSentryExpoConfig` (already in `metro.config.js`) handle the client side of
this — debug IDs get embedded in the bundle automatically. What's still
needed is telling `sentry-cli` (invoked by the plugin's native build hooks,
release builds only — see `sentry.gradle`) which org/project/token to upload
to. Set these as **EAS secrets** (never commit them, and don't put them in
`.env`/`.env.local` — `SENTRY_AUTH_TOKEN` is a real secret):

```bash
eas secret:create --scope project --name SENTRY_ORG --value <org-slug>
eas secret:create --scope project --name SENTRY_PROJECT --value <project-slug>
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <auth-token>
```

Generate the auth token at *Sentry → Settings → Auth Tokens* with the
`project:releases` and `org:read` scopes.

With those three secrets present, `eas build --profile production` (and any
other non-development profile) will upload source maps automatically — no
further plugin config needed. Local `expo run:android`/`expo run:ios` dev
builds are unaffected either way (the upload step only runs for release
build variants).

## 4. Verify

- Trigger a test error in a release build (or temporarily call
  `Sentry.captureException(new Error("test"))` from a dev build with the DSN
  set) and confirm it shows up in the Sentry dashboard with a readable stack
  trace (not raw minified/Hermes bytecode locations).
- Confirm `environment` on the captured event matches what you expect
  (`development` from a dev-client build, `production` from a release build).
