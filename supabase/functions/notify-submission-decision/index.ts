// Push notification for a moderator decision on a catalog suggestion.
// Invoked by review_submission (see db/schema.sql) through pg_net, the same
// way pg_cron invokes send-wear-reminder — fire-and-forget, best-effort, and
// wrapped in an exception handler there so a push failure never blocks the
// moderator's decision. Requires the same x-internal-secret header as
// send-wear-reminder (enforced once INTERNAL_FN_SECRET is set) so app
// clients holding only the anon key can't replay decision pushes. Reads with
// the service role since this runs with no caller session; sends via Expo's
// push API and prunes stale tokens.
import { createClient } from "npm:@supabase/supabase-js@2"

type PushTicket = {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

type SubmissionRow = {
  user_id: string
  brand: string
  title: string
  status: string
  moderator_note: string | null
}

const messageFor = (submission: SubmissionRow) => {
  const name = `${submission.brand} - ${submission.title}`
  switch (submission.status) {
    case "approved":
      return { title: "Suggestion added! 🎉", body: `"${name}" is now in the catalog.` }
    case "merged":
      return {
        title: "Suggestion matched! 🔗",
        body: `"${name}" was already in the catalog — we linked it to your collection.`,
      }
    case "rejected":
      return {
        title: "Suggestion reviewed",
        body: submission.moderator_note
          ? `"${name}" wasn't added: ${submission.moderator_note}`
          : `"${name}" wasn't added to the catalog.`,
      }
    default:
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  const secret = Deno.env.get("INTERNAL_FN_SECRET")
  if (secret && req.headers.get("x-internal-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { submission_id } = (await req.json().catch(() => ({}))) as { submission_id?: string }
  if (!submission_id) {
    return Response.json({ error: "submission_id is required" }, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: submission, error: subError } = await supabase
    .from("fragrance_submissions")
    .select("user_id, brand, title, status, moderator_note")
    .eq("id", submission_id)
    .single()
  if (subError || !submission) {
    return Response.json({ error: subError?.message ?? "submission not found" }, { status: 404 })
  }

  const message = messageFor(submission as SubmissionRow)
  if (!message) return Response.json({ sent: 0, skipped: "not a decided submission" })

  const { data: tokenRows, error: tokenError } = await supabase
    .from("user_push_tokens")
    .select("token")
    .eq("user_id", submission.user_id)
  if (tokenError) return Response.json({ error: tokenError.message }, { status: 500 })
  if (!tokenRows || tokenRows.length === 0) return Response.json({ sent: 0, removed: 0 })

  const chunk = tokenRows.map(({ token }) => ({ to: token, ...message }))
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chunk),
  })
  if (!res.ok) {
    console.error("Expo push API error", res.status, await res.text())
    return Response.json({ error: "push send failed" }, { status: 502 })
  }

  const { data: tickets } = (await res.json()) as { data?: PushTicket[] }
  const staleTokens: string[] = []
  let sent = 0
  tickets?.forEach((ticket, idx) => {
    if (ticket.status === "ok") {
      sent++
    } else if (ticket.details?.error === "DeviceNotRegistered") {
      staleTokens.push(chunk[idx].to)
    } else {
      console.error("Push ticket error", ticket.message, ticket.details)
    }
  })

  if (staleTokens.length > 0) {
    await supabase.from("user_push_tokens").delete().in("token", staleTokens)
  }

  return Response.json({ sent, removed: staleTokens.length })
})
