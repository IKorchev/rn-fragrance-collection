// In-app account deletion (App Store 5.1.1(v) / Play Store requirement).
// Invoked by the signed-in user; verifies their JWT, then deletes the auth
// user with the service role. All app tables (user_fragrances, wear_events,
// user_push_tokens) reference auth.users(id) ON DELETE CASCADE, so the
// user's data goes with it. wear_events rows are deleted too — the community
// leaderboard intentionally forgets deleted accounts.
import { createClient } from "npm:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "")
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)
  if (userError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error("Failed to delete user", user.id, deleteError)
    return Response.json({ error: deleteError.message }, { status: 500 })
  }

  return Response.json({ deleted: true })
})
