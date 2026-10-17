# Whiff

Expo (React Native) app for tracking a fragrance collection, backed by Supabase.

## Stack

- Expo SDK 57 — React Native 0.86, React 19, Expo Router (native tabs), TypeScript (strict)
- NativeWind v4 with a token-based design system (`src/design-system/tokens.ts`)
- Supabase — Postgres with Row Level Security, Auth (Google, Apple), Edge Functions
- TanStack Query for all reads; writes go through `AuthContext`
- RevenueCat (subscriptions), Google AdMob (interstitials, UMP consent), Sentry (inert without a DSN)
- EAS Build for binaries; OTA updates from a self-hosted [xprem](https://mercure-technologies.gitbook.io/xprem) server, not EAS Update

## Setup

Requires Node 22, Yarn 1, and Android Studio or Xcode.

```bash
yarn install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local` (`.env.example` documents each value), then build and run a dev client:

```bash
yarn android
```

`yarn ios` on macOS. Expo Go is not supported: Google Sign-In's OAuth redirect is registered for the app's bundle ID, and the app uses native modules.

Database: run `db/schema.sql` once on a fresh Supabase project. Later schema changes are versioned files in `supabase/migrations/`, applied in lockstep with the live project, with `db/schema.sql` kept current and `src/lib/database.types.ts` regenerated.

## Commands

| Command | Description |
|---|---|
| `yarn start` | Metro for the dev client |
| `yarn android` / `yarn ios` | Local dev-client build |
| `yarn typecheck` | `tsc --noEmit` — the only automated check (no test suite or linter) |
| `yarn ota:publish --branch <preview\|production>` | Preflight env check, then publish an OTA update via eoas |

Maestro E2E flows are in `.maestro/`. Never run `eas update` or bare `eoas`: `eoas` disables dotenv and would ship a bundle with every `EXPO_PUBLIC_*` value undefined.

## CI/CD

GitHub Actions (`.github/workflows/`):

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | PRs, pushes to `main` | Typecheck |
| `ota-publish.yml` | Push to `main` | OTA update → `preview` |
| | Tag `v<app version>-ota.<n>` on `main` | OTA update → `production`, after approval on the `production` environment |
| | Manual dispatch | Either branch, chosen platform (hotfixes, rollbacks) |
| `eas-build.yml` | Manual dispatch | Queue an EAS build |

The OTA job pulls the bundle-time `EXPO_PUBLIC_*` values from the matching EAS environment. Repo secrets: `EXPO_TOKEN`, `XPREM_BASE_URL`, `EOO_TOKEN`.

The runtime version follows `app.json`'s `version`. Native changes need a version bump and a store build; an OTA tag must match the current version, which is never bumped just to tag a release.

## Layout

```
src/app/              Expo Router routes (tabs: Discover, Search, Collection, Profile)
src/components/       Feature components; shared/ui/ for generic primitives
src/contexts/         Auth + collection writes, theme, locale, toasts
src/design-system/    Tokens
src/lib/              Supabase client, query hooks, DB types, i18n, gamification, utils
db/schema.sql         Current schema
supabase/migrations/  Versioned migrations
supabase/functions/   Edge functions
docs/                 OTA server, Sentry, legal documents
.github/workflows/    CI/CD
```

Architecture notes and conventions: [CLAUDE.md](CLAUDE.md). OTA server and rollbacks: [docs/ota-self-hosted.md](docs/ota-self-hosted.md).
