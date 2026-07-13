// Syncs Pro-tier entitlement state from RevenueCat into the `subscriptions`
// table (see db/schema.sql). RevenueCat's SDK is the client-side source of
// truth for UI gating (CustomerInfo cache); this table exists for
// server-side enforcement and admin visibility from SQL.
//
// Configure this function's URL in RevenueCat's dashboard (Project settings
// -> Integrations -> Webhooks), with "Authorization: Bearer <secret>" as the
// header, matching REVENUECAT_WEBHOOK_SECRET below (set via
// `supabase secrets set`). Verified against that static secret rather than a
// Supabase JWT, since RevenueCat is the caller, not a signed-in user —
// deployed with verify_jwt disabled.
//
// `app_user_id` in the payload must equal the Supabase auth user id — the
// app links them by calling Purchases.logIn(user.id) right after sign-in.
//
// This same webhook URL also receives non-entitlement events (paywall
// impression/close analytics, TEST, and anything RevenueCat adds later) that
// don't carry expiration_at_ms — an allowlist (rather than excluding just
// EXPIRATION) keeps those from being misread as "still entitled".
import { createClient } from "npm:@supabase/supabase-js@2"

// TRANSFER is deliberately absent: it carries no expiration_at_ms and its
// app_user_id doesn't distinguish the transferred-from user (who must LOSE
// pro) from the transferred-to user — processing it granted permanent pro to
// whichever id it named. The receiving user syncs on their next renewal.
const SUBSCRIPTION_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "CANCELLATION",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_PAUSED",
  "EXPIRATION",
  "BILLING_ISSUE",
])

// These leave the subscription inactive regardless of expiration_at_ms (a
// paused sub can still carry a future expiration date).
const INACTIVE_EVENT_TYPES = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED"])

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  const auth = req.headers.get("Authorization") ?? ""
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET")
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { event } = await req.json()
  const userId = event?.app_user_id as string | undefined
  if (!userId) {
    return Response.json({ error: "Missing app_user_id" }, { status: 400 })
  }

  if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    console.log("Skipping non-entitlement event", event.type, userId)
    return Response.json({ ok: true, skipped: "non-entitlement event", type: event.type })
  }

  // Comparing expiration to now (rather than branching on every remaining
  // event type) handles renewals, billing-issue grace periods, and product
  // changes the same way. A missing expiration only means "active" for
  // one-time purchases (lifetime); subscription events always carry one, so
  // null there must not read as forever-pro.
  const expiresAtMs = event.expiration_at_ms as number | null
  const activeByExpiration =
    event.type === "NON_RENEWING_PURCHASE"
      ? true
      : expiresAtMs != null && expiresAtMs > Date.now()
  const isPro = !INACTIVE_EVENT_TYPES.has(event.type) && activeByExpiration

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      is_pro: isPro,
      entitlement: event.entitlement_ids?.[0] ?? null,
      expires_at: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) {
    // 23503 = foreign key violation: app_user_id doesn't match a real
    // auth.users row. Expected for RevenueCat's "Send Test Event" button
    // (synthetic id) — ack with 200 so it isn't retried as a real failure.
    if (error.code === "23503") {
      console.warn("Ignoring webhook for unknown user", userId)
      return Response.json({ ok: true, skipped: "unknown user" })
    }
    console.error("Failed to sync subscription", userId, error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
})
