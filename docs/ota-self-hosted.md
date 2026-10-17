# Self-hosted OTA updates (xprem)

This app ships JS/asset-only updates through a **self-hosted** [xprem](https://github.com/mercuretechnologies/xprem)
server instead of EAS Update. `expo-updates` on the device is unchanged — only the
host it talks to, and the CLI that publishes, are different.

> xprem is not affiliated with, sponsored, or endorsed by Expo. It was formerly
> called `expo-open-ota`.

Four vendor skills live in `.claude/skills/xprem-*`, and the docs are registered
as an MCP server (`xprem-docs`). Both defer to the live docs — do that rather
than trust a command cached here, especially for env-var names.

---

## What is actually deployed

| Piece | Value |
|---|---|
| Server | `https://xprem-419723040511.europe-west1.run.app` (Cloud Run, `europe-west1`) |
| Image | `xprem:v3.2.6`, pulled through Artifact Registry remote repo `xprem-remote` → `ghcr.io` |
| GCP project | `fragrance-e4852` (the Firebase project; billing linked) |
| Control plane | Neon Postgres 18, project `fragrance-ota`, `aws-eu-central-1` |
| Bundle storage | GCS `gs://fragrance-e4852-ota-updates` (**private**), SA `xprem-storage@fragrance-e4852.iam.gserviceaccount.com` |
| App ID | `2d22eb15-8b4a-48df-abcf-fab2af5e91c2` |
| Channel → branch | `production` → `production` |

Secrets (`XPREM_BASE_URL`, `EOO_TOKEN`, admin credentials) live in `.env.local`.
`DB_KEYS_MASTER_KEY_B64` is **not recoverable** — it encrypts the app signing key
at rest in Postgres. Losing it means new signing keys and a new store release.

### Request flow

```
Phone launches / foregrounds
  │
  ├─1─►  GET /manifest                       Cloud Run, ~22KB, signed
  │      Expo-Platform / Expo-Runtime-Version / expo-channel-name / expo-app-id
  │
  ├─2─►  GET /assets?h=…                     Cloud Run, 942-byte 302
  │      └─► 302 storage.googleapis.com/…?X-Goog-Signature=…   (15-min pre-signed)
  │
  └─3─►  bundle + asset bytes                straight from GCS, never via Cloud Run
```

**Do not set `CDN_BASE_URL`, and do not make the bucket public.** Because
`GOOGLE_APPLICATION_CREDENTIALS_B64` is set, xprem issues pre-signed GCS URLs, so
the bucket stays private and almost no bytes cross Cloud Run. A generic CDN would
*require* a public bucket — strictly worse here. Likewise never set
`DISABLE_S3_DIRECT_CDN` or `ENABLE_PREVENT_CDN_REDIRECTION_HEADER`: both force
every asset byte through the server.

### Cost

Cloud Run's free tier is 2M requests, 180k vCPU-s, 360k GiB-s and 1 GB egress per
month. Only manifests and redirects cross it, so egress is negligible. Neon and
GCS at this volume are inside their free tiers. Scale-to-zero is on
(`min-instances=0`), which is safe because `fallbackToCacheTimeout: 0` means a
failed or slow update check never blocks app launch.

---

## Publishing

```bash
yarn ota:publish --branch production
yarn ota:publish --branch production --rollout-percentage 10 -m "fix picker crash"
```

Takes ~4 minutes, nearly all of it `expo export` building two ~7.5MB Hermes
bundles. `--branch` is required.

The usual path is GitHub Actions (`.github/workflows/ota-publish.yml`):

- every push to `main` publishes to `preview`;
- a release tag publishes the tagged commit to `production` once approved on
  the `production` GitHub environment (required reviewer; it only accepts
  `main` and release tags):

  ```bash
  git tag v1.4.0-ota.1   # v<app.json version>-ota.<n>, on main
  git push origin v1.4.0-ota.1
  ```

  The version in the tag must equal `app.json`'s (the runtime) — the job fails
  otherwise. Don't bump `app.json` to make a tag: that changes the runtime and
  no installed binary would take the update;
- Actions → OTA publish → Run workflow publishes to `preview` or `production`
  for a chosen platform — for hotfixes and rollbacks. It runs the same
`yarn ota:publish` (preflight included), after `eas env:pull` writes the
matching EAS environment's values to `.env.local` — EAS is the one place the
bundle-time `EXPO_PUBLIC_*` values live for CI. GitHub secrets: `EXPO_TOKEN`,
`XPREM_BASE_URL`, `EOO_TOKEN`. It passes `--nonInteractive` and an explicit
`--serverUrl`, since eoas otherwise stops to confirm the server URL.

### Never call `eoas` directly

`eoas` runs `expo export` with `EXPO_NO_DOTENV=1` and loads no `.env` files, but
this app reads nine `EXPO_PUBLIC_*` values at bundle time (`src/lib/supabase.ts`,
`src/contexts/auth-context.tsx`, `src/lib/purchases.ts`, `src/lib/ads.ts`,
`src/lib/sentry.ts`). A bare `npx eoas publish` inlines `undefined` for all of
them and succeeds — and because `src/lib/supabase.ts` asserts both Supabase
values with `!`, nothing throws at build and every install that takes the update
silently loses its backend.

`yarn ota:publish` is the documented `dotenv -e .env.local -- eoas publish` with
`scripts/preflight-ota.mjs` in front, which refuses to publish when a required
variable is missing and warns when an optional one (RevenueCat, AdMob, Sentry)
would be dropped.

### Gotchas that cost time here

- **`eoas` refuses a dirty git tree**, untracked files included. Commit, or pass
  `--disableRepositoryCheck` for a throwaway run.
- **An update reaches nobody until a channel maps to its branch.** Channels are
  dashboard-only (`eoas` has no channel command). Without the mapping the client
  gets `404 No branch mapping found`.
- **Runtime version must match the installed binary exactly.** Policy is
  `appVersion`, so it tracks `version` in `app.json` (currently `1.2.0`) — bump it
  for any native change, as before. A mismatch fails silently on both sides.
- **Pin `eoas` to the server version.** `package.json` pins `eoas@3.2.6`; a
  v3.2.0+ server rejects older CLIs.

---

## Verifying a publish

```bash
curl -sS -D - -o body.bin \
  -H 'Accept: multipart/mixed,application/expo+json,application/json' \
  -H 'Expo-Platform: android' -H 'Expo-Protocol-Version: 1' \
  -H 'Expo-Runtime-Version: 1.2.0' \
  -H 'expo-channel-name: production' \
  -H 'expo-app-id: 2d22eb15-8b4a-48df-abcf-fab2af5e91c2' \
  -H 'expo-expect-signature: sig, keyid="main", alg="rsa-v1_5-sha256"' \
  https://xprem-419723040511.europe-west1.run.app/manifest
```

Success looks like `HTTP 200`, `content-type: multipart/mixed`, and
`expo-manifest-filters: branch="production"` — that last header is what confirms
the channel resolved to a branch. The `manifest` part carries an `expo-signature`
with `keyid=main`; it verifies as `RSA-SHA256` over the raw part bytes against
`certs/certificate.pem`. Note the signature header omits `alg`, which is fine —
the client falls back to `codeSigningMetadata.alg`.

`npx eoas@3.2.6 doctor --channel production` checks reachability. It warns that
v1 clients (no `expo-app-id` header) are rejected; that is correct here because
no build predates this server.

---

## Rollback

- **Previous update** — `npx eoas@3.2.6 rollback` / `republish`, or the dashboard.
  This re-publishes with a fresh commit time, which is required: `expo-updates`
  only moves to an update whose `commitTime` is *newer* than the running one
  (`LoaderSelectionPolicyFilterAware`), so merely re-pointing at an older update
  does nothing.
- **Back to the store build** — the `rollBackToEmbedded` directive, which discards
  OTA state and runs the bundle inside the binary.

Progressive rollouts and the dashboard are MIT. Observe/ClickHouse and the Errors
explorer are Enterprise and are not set up.

---

## Local development

`yarn start`, `android`, `ios`, `web` all run through
`cross-env DISABLE_CODE_SIGNING=1`, as the xprem docs prescribe for dev scripts
(`cross-env` because the docs' inline `FOO=1 cmd` form is a parser error in
PowerShell). It is required: the signing private key never leaves the server in
control-plane mode, so `expo start --dev-client` cannot sign a dev manifest.

`app.config.js` throws if `DISABLE_CODE_SIGNING` is ever set alongside
`EAS_BUILD`. Never defeat that guard — a release built with signing disabled
applies updates **without verifying signatures**, handing the app to anyone who
can answer the update URL.

---

## Operating the server

Change config:

```bash
gcloud run services update xprem --region=europe-west1 --project=fragrance-e4852 \
  --update-env-vars=KEY=value
```

**Upgrading the image:** bump the tag in the Artifact Registry remote path; the
proxy pulls it from `ghcr.io` on demand, so no local Docker is involved.

```bash
gcloud run deploy xprem --region=europe-west1 --project=fragrance-e4852 \
  --image=europe-west1-docker.pkg.dev/fragrance-e4852/xprem-remote/mercuretechnologies/xprem:vX.Y.Z
```

> **Schema migrations run on boot, and `min-instances=0` can kill them midway.**
> On a version upgrade with many migrations, set `--min-instances=1 --max-instances=1`
> first so one instance completes them uninterrupted, then restore
> `--min-instances=0 --max-instances=3`. Symptom if you skip it: `/hc` returns 200
> while `/dashboard` returns 503 `storage migration in progress`, with the control
> plane re-initialising in the logs on every request.

Logs: `gcloud run services logs read xprem --region=europe-west1 --project=fragrance-e4852`

---

## Still to do before a release

1. **Build natively.** The server URL and certificate are embedded at build time,
   so no existing install talks to this server yet. For EAS builds set
   `XPREM_BASE_URL` as an EAS environment variable — it is deliberately not in
   `eas.json`, so a misconfigured build fails loudly instead of shipping an
   unreachable update URL.
2. **Verify on a real device** that the update is fetched and applied.

---

## Optional: the instance MCP

A control-plane deployment exposes `/mcp` (OAuth 2.1, acting as your dashboard
account) for listing apps/branches/updates and doing rollbacks:

```bash
claude mcp add --transport http xprem https://xprem-419723040511.europe-west1.run.app/mcp
```

Keep the docs MCP (`xprem-docs`) separate — see `.claude/skills/xprem-connect-mcp`.
