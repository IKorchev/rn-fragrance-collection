// Daily "pick today's fragrance" push reminder.
// Invoked by pg_cron (see db/schema.sql) with the anon key as Bearer JWT plus
// the x-internal-secret header (Vault secret `internal_fn_secret`) — the anon
// key ships in the app binary, so without the secret anyone could trigger
// push spam to every opted-in user. Enforcement activates once the
// INTERNAL_FN_SECRET function secret is set (supabase secrets set), so
// deploying ahead of the secret can't break the cron job. Reads tokens with
// the service role (RLS bypass is intentional — this is the trusted sender),
// sends via Expo's push API, and prunes tokens Expo reports as
// DeviceNotRegistered. Each user gets a suggested fragrance and the
// "wear-reminder" action category (buttons registered in
// src/lib/notifications.ts).
import { createClient } from "npm:@supabase/supabase-js@2"

type PushTicket = {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

type FragranceRow = {
  id: string
  user_id: string
  name: string
  times_worn: number | null
  last_worn: string | null
}

const RECENTLY_WORN_MS = 24 * 60 * 60 * 1000

// Mirrors src/lib/utils/pick-weighted-index.ts
const pickWeighted = (col: FragranceRow[]): FragranceRow | null => {
  if (!col.length) return null
  const now = Date.now()
  const weights = col.map((item) => {
    let weight = 1 / ((item.times_worn ?? 0) + 1)
    const lastWornMs = item.last_worn ? new Date(item.last_worn).getTime() : null
    if (lastWornMs && now - lastWornMs < RECENTLY_WORN_MS) {
      weight *= 0.15
    }
    return weight
  })
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return col[i]
  }
  return col[col.length - 1]
}

const titleOf = (name: string) => {
  const parts = name.split(" - ")
  return parts[1] ?? parts[0]
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("INTERNAL_FN_SECRET")
  if (secret && req.headers.get("x-internal-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: rows, error } = await supabase
    .from("user_push_tokens")
    .select("user_id, token")
    .eq("reminders_enabled", true)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return Response.json({ sent: 0, removed: 0 })

  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: fragRows, error: fragError } = await supabase
    .from("user_fragrances")
    .select("id, user_id, name, times_worn, last_worn")
    .in("user_id", userIds)
  if (fragError) return Response.json({ error: fragError.message }, { status: 500 })

  const byUser = new Map<string, FragranceRow[]>()
  for (const frag of (fragRows ?? []) as FragranceRow[]) {
    const list = byUser.get(frag.user_id) ?? []
    list.push(frag)
    byUser.set(frag.user_id, list)
  }
  const suggestionByUser = new Map<string, FragranceRow | null>()
  for (const id of userIds) {
    suggestionByUser.set(id, pickWeighted(byUser.get(id) ?? []))
  }

  const messages = rows.map(({ user_id, token }) => {
    const suggestion = suggestionByUser.get(user_id)
    if (!suggestion) {
      return {
        to: token,
        title: "Fragrance Collection",
        body: "Time to pick today's fragrance 👃✨",
      }
    }
    return {
      to: token,
      title: "Fragrance Collection",
      body: `Time for ${titleOf(suggestion.name)}? 👃✨`,
      categoryId: "wear-reminder",
      data: { userFragranceId: suggestion.id, name: suggestion.name },
    }
  })

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
