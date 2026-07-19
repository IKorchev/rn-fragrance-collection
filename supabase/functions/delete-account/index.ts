// In-app account deletion (App Store 5.1.1(v) / Play Store requirement).
// Invoked by the signed-in user; verifies their JWT, then deletes the auth
// user with the service role. All app tables (user_fragrances, wear_events,
// user_push_tokens, user_profiles) reference auth.users(id) ON DELETE
// CASCADE, so the user's data goes with it. wear_events rows are deleted too
// — the community leaderboard intentionally forgets deleted accounts.
// Storage objects don't cascade, so the profile-header photo folder is
// purged explicitly first (best-effort: an orphaned image must never block
// the store-mandated account deletion).
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

  try {
    const { data: objects, error: listError } = await admin.storage
      .from("profile-headers")
      .list(user.id, { limit: 1000 })
    if (listError) throw listError
    if (objects && objects.length > 0) {
      const { error: removeError } = await admin.storage
        .from("profile-headers")
        .remove(objects.map((o) => `${user.id}/${o.name}`))
      if (removeError) throw removeError
    }
  } catch (storageError) {
    console.error("Failed to purge profile-headers for", user.id, storageError)
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error("Failed to delete user", user.id, deleteError)
    return Response.json({ error: deleteError.message }, { status: 500 })
  }

  return Response.json({ deleted: true })
})
