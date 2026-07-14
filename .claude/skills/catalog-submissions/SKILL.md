---
name: catalog-submissions
description: The user-suggested catalog submission and moderation pipeline — use when touching manual-add-modal.tsx, the add_manual_fragrance / review_submission RPCs, the fragrance_submissions table, or building a moderation UI.
---

# User-suggested catalog additions

## Manual add → silent submission

A manual add (brand + name in `src/components/manual-add-modal.tsx`) goes through the `add_manual_fragrance` RPC, which inserts the personal row (`user_fragrances`, `fragrance_id` null) and silently queues a `fragrance_submissions` row in one transaction:

- The suggestion half is a **best-effort subtransaction** — it can never fail or delay the add.
- There is **no user-facing toggle** — surfacing to the shared catalog is a moderator decision, not the submitter's.
- Rate-capped at 5 pending submissions per user, serialized via advisory lock.
- Stores a pg_trgm similarity score + closest catalog match for triage, found via KNN on the `fragrances_brand_name_trgm_gist_idx` GiST index.

The modal also shows a live "did you mean" strip (reuses `useFragranceSearch`) so near-misses become catalog-linked adds instead of submissions.

## Moderation

Pending submissions are invisible to other users — only the `review_submission` RPC inserts or links catalog rows. It is moderator-gated via the `moderators` table, or trusted when called with no JWT from the Supabase dashboard SQL editor:

```sql
SELECT review_submission('<id>', 'approve'|'merge'|'reject', ...);
```

- **approve** — inserts the `fragrances` catalog row, with `source_url = 'user:<submission-id>'` as the dedup key.
- **merge** — links an existing catalog row instead.
- Both backfill the submitter's `fragrance_id` + `wear_events`.
- **reject** — leaves the personal row untouched.

### In-app moderation screen

`src/app/moderation.tsx` (formSheet) is the primary way to moderate — entry point in `profile.tsx`, shown only when `useIsModerator(user?.id)` (a direct `moderators` table read, RLS-scoped to your own membership row) returns true. The screen itself:

- Lists pending submissions via `usePendingSubmissions` → the `list_pending_submissions` RPC (`src/lib/queries.ts`) — a moderator-gated SECURITY DEFINER read, since the `moderators`-only RLS policy on `fragrance_submissions` blocks a moderator from seeing anyone else's rows directly.
- Each row shows the closest catalog match (if `similarity` found one) so you can tell approve from merge at a glance.
- Approve / Merge / Reject buttons call `reviewSubmission` (`AuthContext`), a thin wrapper around `review_submission` — the RPC re-checks `moderators` membership itself, so the screen's visibility is a convenience, not the authorization boundary. Merge always targets the suggested closest match; there's no manual "pick a different catalog row" UI yet.
- Rejecting reveals an inline optional note field — whatever you type there is what `notify-submission-decision` puts in the push to the submitter, so keep it user-facing-friendly.

The SQL editor path above still works and is the only way to merge into a fragrance other than the auto-suggested match, or to review from a machine that isn't signed into the app as a moderator.

## Notifying the submitter

Every decision (approve/merge/reject) ends with `review_submission` firing a best-effort push to the submitter via `pg_net`, the same `net.http_post` + Vault-secret pattern the wear-reminder cron job uses (`db/schema.sql`, requires the `project_url`/`anon_key` Vault secrets already set up for that job). It POSTs `{ submission_id }` to the `notify-submission-decision` edge function (`supabase/functions/notify-submission-decision`), which reads the now-decided row, composes copy per outcome (approved/merged include the fragrance name; rejected includes the moderator note if one was given), and sends via Expo's push API to all of that user's `user_push_tokens` — pruning stale tokens the same way `send-wear-reminder` does. The whole call is wrapped in a `BEGIN...EXCEPTION WHEN OTHERS THEN NULL` block in `review_submission`, so a missing Vault secret, a down edge function, or a push failure never blocks or fails the moderator's decision.
