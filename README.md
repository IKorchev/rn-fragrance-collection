# Fragrance Collection

A React Native (Expo) app for tracking a personal fragrance collection. Search a ~64k-fragrance database, build your collection, log wears, and let the weighted picker decide what to wear today.

[Demo video](https://streamable.com/qiw7hq) *(older version — UI has since been redesigned)*

## Features

- **Google sign-in** via Supabase Auth (expo-auth-session)
- **Collection tracking** — wear counter with "last worn" history, swipe-left to edit or delete (with undo toast)
- **Weighted random picker** — slot-machine reel that favors less-worn fragrances and avoids repeating what you wore in the last 24h
- **Discover & Top 100** — browse the scraped fragrance catalog and per-gender rankings
- **Search** — find any fragrance and add it in one tap
- **Light/dark theme**, persisted across restarts

## Stack

- **Expo SDK 57** (React Native 0.86, React 19) with **Expo Router** file-based routing and native tabs
- **TypeScript** (strict) — DB row types generated from the live Supabase schema
- **Supabase** — Postgres (with Row Level Security) + Auth + Realtime
- **TanStack Query** for all data fetching
- **NativeWind v4** (Tailwind) for styling

Related repos:
- `fragrance-db` — scraper + catalog database (Postgres/R2) this app reads from *(local project)*
- [`webscraping-api`](https://github.com/IKorchev/webscraping-api) — legacy Vercel search backend, still powering the Search tab

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
| `EXPO_PUBLIC_API_URL` | `webscraping-api` deployment URL (Search tab) |

For a fresh Supabase project, run `db/schema.sql` once in the SQL editor.

## Project structure

```
src/
  app/          — Expo Router routes (native tabs + nested stacks)
  components/   — UI components
  contexts/     — auth (Supabase + collection writes + picker), theme, toasts
  lib/          — Supabase client, TanStack Query hooks, generated DB types, utils
db/schema.sql   — app tables (RLS policies, increment_wear RPC)
```

```bash
yarn typecheck   # tsc --noEmit
```
