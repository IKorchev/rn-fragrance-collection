// Daily "pick today's fragrance" push reminder.
// Invoked by pg_cron (see db/schema.sql) with the anon key as Bearer JWT;
// reads tokens with the service role (RLS bypass is intentional — this is
// the trusted sender), sends via Expo's push API, and prunes tokens Expo
// reports as DeviceNotRegistered.
import { createClient } from "npm:@supabase/supabase-js@2"

type PushTicket = {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: rows, error } = await supabase.from("user_push_tokens").select("token")
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return Response.json({ sent: 0, removed: 0 })

  const messages = rows.map(({ token }) => ({
    to: token,
    title: "Fragrance Collection",
    body: "Time to pick today's fragrance 👃✨",
  }))

  const staleTokens: string[] = []
  let sent = 0

  // Expo accepts at most 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      console.error("Expo push API error", res.status, await res.text())
      continue
    }
    const { data: tickets } = (await res.json()) as { data?: PushTicket[] }
    tickets?.forEach((ticket, idx) => {
      if (ticket.status === "ok") {
        sent++
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        staleTokens.push(chunk[idx].to)
      } else {
        console.error("Push ticket error", ticket.message, ticket.details)
      }
    })
  }

  if (staleTokens.length > 0) {
    await supabase.from("user_push_tokens").delete().in("token", staleTokens)
  }

  return Response.json({ sent, removed: staleTokens.length })
})
