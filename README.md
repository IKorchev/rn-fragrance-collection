# Whiff

_Formerly "Fragrance Collection."_

A React Native (Expo) app for tracking a personal fragrance collection. Search a ~64k-fragrance database, build your collection, log wears, and let the weighted picker decide what to wear today.

## Features

- **Google & Apple sign-in** via Supabase Auth (expo-auth-session / expo-apple-authentication)
- **Collection tracking** — wear counter with "last worn" history, personal 1–5 rating + notes, swipe-left to delete (with undo toast), search/sort/filter your own collection
- **Weighted random picker** — slot-machine reel (with haptics) that favors less-worn fragrances and avoids repeating what you wore in the last 24h
- **Undo a wear** — a mistap doesn't cost the whole day; toast-undo reverses the one-wear-per-day counter
- **Most Worn leaderboard** — community wear-count rankings, windowed day/week/month/year/all
- **Search & manual add** — find any catalog fragrance and add it in one tap, or add it by hand if the catalog doesn't have it
- **Daily wear reminder push**, with an in-app opt-out toggle
- **In-app account deletion** and a hosted privacy policy (`docs/privacy-policy.md`)
- **Light/dark theme**, persisted across restarts
- Offline-aware queries (pause/resume on connectivity change) and empty/error states throughout

## Stack

- **Expo SDK 57** (React Native 0.86, React 19) with **Expo Router** file-based routing and native tabs
- **TypeScript** (strict) — DB row types generated from the live Supabase schema
- **Supabase** — Postgres (with Row Level Security) + Auth + Realtime
- **TanStack Query** for all data fetching
- **NativeWind v4** (Tailwind) for styling

## Getting started

```bash
yarn install
cp .env.example .env   # then fill in real values — see below
yarn ios               # or: yarn android (dev-client build required)
```

Google Sign-In needs a real dev-client build (`yarn ios` / `yarn android`), not Expo Go — the OAuth redirect is registered for the app's own bundle ID.

### Environment

| Variable | Where to get it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `EXPO_PUBLIC_GOOGLE_{IOS,ANDROID,WEB}_CLIENT_ID` | Google Cloud Console OAuth credentials, registered with Supabase Auth's Google provider |
| `EXPO_PUBLIC_SENTRY_DSN` (optional) | sentry.io project → Client Keys. Crash reporting is disabled entirely if unset |

For a fresh Supabase project, run `db/schema.sql` once in the SQL editor.

## Project structure

```
src/
  app/          — Expo Router routes (native tabs + nested stacks)
  components/   — UI components
  contexts/     — auth (Supabase + collection writes + picker), theme, toasts
  lib/          — Supabase client, TanStack Query hooks, generated DB types, utils
db/schema.sql   — app tables (RLS policies, increment_wear/undo_wear RPCs)
supabase/functions/ — edge functions (send-wear-reminder cron push, delete-account)
docs/privacy-policy.md — privacy policy to host publicly for store listings
```

```bash
yarn typecheck   # tsc --noEmit
```
