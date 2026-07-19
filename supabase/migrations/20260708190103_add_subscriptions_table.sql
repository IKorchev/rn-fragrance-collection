-- Pro-tier entitlement state, synced from RevenueCat via a webhook
-- (supabase/functions/revenuecat-webhook). RevenueCat's SDK is the
-- client-side source of truth for UI gating (CustomerInfo cache); this
-- table exists for server-side enforcement (e.g. a free-tier collection
-- cap) and admin visibility from SQL. Only the service role writes to it.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pro       BOOLEAN NOT NULL DEFAULT false,
  entitlement  TEXT,
  expires_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription" ON subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
