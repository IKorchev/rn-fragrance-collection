# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A React Native (Expo) mobile app for tracking a personal fragrance/perfume collection. Users sign in with Google, search a scraped fragrance database, add items to their collection, track how many times they've worn each one, and use a random "picker" to choose what to wear. Data is stored in Firebase (Firestore + Auth). Search/Top-100 data comes from a separate backend (a Vercel function that scrapes https://www.parfumo.net/ with Puppeteer — repo: `webscraping-api`, not part of this codebase).

## Commands

There is no test suite, linter, or type checker configured in this project — do not invent `npm test`/`npm run lint` commands.

```bash
yarn start           # expo start
yarn android         # expo run:android (local dev-client build)
yarn ios             # expo run:ios (local dev-client build)
yarn web             # expo start --web
```

The project is on Expo SDK 57 (`react-native` 0.86, React 19.2). Google Sign-In requires a real dev-client build (`expo run:ios`/`run:android`) rather than plain Expo Go — Expo Go's fixed identity (`host.exp.exponent`) can't satisfy the OAuth redirect URI registered for this app's real bundle ID (`com.korchev.fragrancecollection`).

### Required local env vars (gitignored, not in repo)

Copy `.env.example` to `.env` and fill in real values — the app compiles with placeholders but auth/data won't work without them:
- `EXPO_PUBLIC_FIREBASE_*` — Firebase project config (Firebase console → Project settings).
- `EXPO_PUBLIC_GOOGLE_{IOS,ANDROID,WEB}_CLIENT_ID` — Google Cloud Console OAuth client IDs (Credentials page). The Android client's SHA-1 must match your local debug keystore (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`).
- `EXPO_PUBLIC_API_URL` — the `webscraping-api` backend URL, consumed by `lib/utils/fetchData.js`.

## Architecture

### Routing (`app/` — Expo Router, file-based)

```
app/_layout.js                          — providers + Stack.Protected auth gate (signed-in vs "sign-in")
app/sign-in.js                          — signed-out screen
app/(tabs)/_layout.js                   — NativeTabs root tab bar (Home / Add / Collection)
app/(tabs)/(home)/_layout.js + index.js — Home tab (own Stack, for the custom header)
app/(tabs)/(collection)/_layout.js + index.js — Collection tab
app/(tabs)/(add)/_layout.js             — Add tab's Stack (header), wraps the nested top-tabs group
app/(tabs)/(add)/(top-tabs)/_layout.js + index.js + search.js — Top 100 / Search sub-tabs (js-top-tabs)
```

Root layout (`app/_layout.js`) wraps the tree in `AuthProvider > ThemeContextProvider > DataContextProvider`, then renders `<Stack.Protected guard={!!user}>`/`guard={!user}` to switch between `(tabs)` and `sign-in` — this replaces what used to be a manual `user ? <Tabs/> : <SigninScreen/>` check. It also holds an `authLoading` gate (see `Contexts/AuthContext.js`) that renders nothing until Firebase's `onAuthStateChanged` has fired at least once, to avoid a sign-in-screen flash on cold start.

**NativeTabs render no header** — each tab (`(home)`, `(collection)`, `(add)`) has its own nested `<Stack>` whose only job is supplying the shared custom `Header.js` via `screenOptions.header`, using `getHeaderTitle` from `expo-router/react-navigation` (not `@react-navigation/elements` directly — Expo Router blocks direct `@react-navigation/*` imports as of SDK 56+; use the `expo-router/react-navigation` and `expo-router/js-top-tabs` re-exports instead).

The nested "Top 100"/"Search" sub-tabs under Add use `expo-router/js-top-tabs`'s `createMaterialTopTabNavigator` wrapped in `withLayoutContext` — this is the pattern to follow for any other nested-tab-inside-a-tab section. Route file names (`index.js`/`search.js`) aren't presentable, so labels come from each `Tabs.Screen`/`MaterialTopTabs.Screen`'s `options.title`, not the route name.

**NativeTabs tradeoffs accepted in this app**: a single `tintColor` (no separate configurable inactive-tab color), no custom `tabBarStyle` (native OS chrome instead — iOS liquid glass / Android Material 3), and the Collection tab's custom hand-drawn icon (originally a live `assets/Collection.js` SVG component) is now a pre-rasterized `assets/collection-icon.png` used via `NativeTabs.Trigger.Icon src={...} renderingMode="template"` (NativeTabs icons can't render arbitrary React components — only SF Symbols/Material Symbols/static images/vector-icon-library glyphs).

### Provider stack

- **`Contexts/AuthContext.js`** (`useAuth`) — owns Firebase auth state (`user`, `authLoading`), Google sign-in/out (via `expo-auth-session`, not the old deprecated `expo-google-app-auth`), and is also the sole owner of all Firestore *write* operations for a user's collection: `addFragranceToCollection`, `deleteFragrance`, `incrementWear`. It subscribes to `users/{uid}/perfumes` via `onSnapshot` and exposes both `userCollection` (raw) and `sortedCollection` (sorted by `times_worn`). Also holds `frag`/`setFrag`, the currently "picked" fragrance — this lives here (not in DataContext) because it needs to reset in response to auth/collection changes.
- **`Contexts/DataContext.js`** (`useData`) — depends on `useAuth()` internally (reads `userCollection`, `db`). Owns the "random picker" logic (`getNewFrag`/`index`) and fetches the read-only Top 100 lists per category (`men`/`women`/`unisex`) from Firestore collections named `top-{category}`.
- **`Contexts/ThemeContext.js`** (`useTheme`) — light/dark theme. Precomputes plain-string class groups (`headerColors`, `viewColors`, `cardColors`, `modalColors`) plus `baseColors`/`baseTextClass`/`baseBorderClass` that components destructure and interpolate into `className` strings. **Important**: NativeWind's class scanner only picks up complete literal class-name strings appearing in source — a runtime-built string like `` `text-${baseColors}` `` (where `baseColors` is a bare variable) will NOT work, even though it's valid JS. Always use the precomputed `baseTextClass`/`baseBorderClass` fields (or add a new literal-branch field here) instead of interpolating a bare color name into a class string.

Because `frag`/collection state lives in `AuthContext` and picker/top-100 state lives in `DataContext`, and `DataContext` depends on `AuthContext`, always keep `AuthProvider` above `DataContextProvider` in the tree.

### Styling

NativeWind v4 (`className` props, Tailwind v3 config in `tailwind.config.js`) — not `tailwind-rn`. Colors referenced outside of `className` (icon `color` props, RN style objects for things Tailwind can't express like `shadowColor`/`shadowOffset`) use `getColor("green-500")` from `lib/utils/colors.js` (a thin wrapper over `tailwindcss/colors`). Third-party UI components from `@rneui/themed` (ListItem, Chip, SearchBar, BottomSheet, Avatar) generally do **not** support `className` on their style-like props (`containerStyle`/`buttonStyle`/`titleStyle`/etc.) — pass real RN style objects (via `getColor()` for theme-driven colors) there instead, not `{ className: "..." }` (that silently no-ops).

### Data model conventions

- Firestore layout: `users/{uid}/perfumes/{docId}` for a user's collection (fields: `name`, `image_url`, `times_worn`, `id`); `top-{men|women|unisex}` collections for the scraped rankings.
- `name` is stored as a single `"Brand - Title"` string and split on `" - "` at render time (see `CollectionListItem.js`, `TopListItem.js`) rather than stored as separate fields — keep this convention when adding new fields/components that display fragrance names.
- List item components (`CollectionListItem.js` for the user's collection, `TopListItem.js` for search/top-100 results) are intentionally separate components with duplicated layout rather than a single parametrized component — this was a deliberate split (see git history) because the two contexts have diverging fields (`place`/`rating`/`totalVotes` vs. `timesWorn`) and actions (add vs. wear/delete). Follow this split rather than re-merging them.
