import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import useAuth, { type AppUser } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { reportError } from "@/lib/sentry"
import { useMyProfile, useWearHistory } from "@/lib/queries"
import type { GamificationState } from "@/lib/gamification"

// The user_profiles snapshot payload — one shape shared by the background
// sync below and the Profile screen's public toggle (which writes it eagerly
// so a just-published profile isn't a row of zeros until the next sync).
export const buildProfileSnapshot = (
  user: AppUser,
  state: GamificationState,
  collection: { times_worn: number }[]
) => {
  const displayName: string = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""
  return {
    display_name: displayName.slice(0, 80),
    avatar_url: user.photoURL?.startsWith("https://") ? user.photoURL : null,
    level: state.level,
    xp: state.xp,
    streak: state.streak,
    total_wears: collection.reduce((sum, el) => sum + el.times_worn, 0),
    collection_count: collection.length,
    badge_ids: state.badges
      .filter((b) => b.earned)
      .map((b) => b.id)
      .sort(),
  }
}

// Keeps the user_profiles snapshot (level, xp, streak, badges, counts,
// identity) in step with the client-computed gamification state — the server
// never recomputes any of it (see the migration comment on user_profiles).
// Mounted once in the tabs layout next to useGamification so a wear logged
// from any tab refreshes the public profile too. Only runs while the profile
// row exists AND is_public: private users write nothing, and the row itself
// is created by the Profile screen's toggle, not here.
export const useProfileSync = (state: GamificationState) => {
  const { user, userCollection, collectionPending } = useAuth()
  const queryClient = useQueryClient()
  const { data: profile } = useMyProfile(user?.id)
  const { data: events } = useWearHistory(user?.id)

  const snapshot = user ? buildProfileSnapshot(user, state, userCollection) : null
  const snapshotKey = JSON.stringify(snapshot)

  useEffect(() => {
    // The loading gates matter: while events/collection are still empty the
    // computed state is all zeros, and syncing that would wipe a real snapshot.
    if (!user?.id || !snapshot || !profile?.is_public || events === undefined || collectionPending)
      return

    const unchanged =
      profile.display_name === snapshot.display_name &&
      profile.avatar_url === snapshot.avatar_url &&
      profile.level === snapshot.level &&
      profile.xp === snapshot.xp &&
      profile.streak === snapshot.streak &&
      profile.total_wears === snapshot.total_wears &&
      profile.collection_count === snapshot.collection_count &&
      [...profile.badge_ids].sort().join() === snapshot.badge_ids.join()
    if (unchanged) return

    supabase
      .from("user_profiles")
      .update({ ...snapshot, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) {
          reportError(error, { flow: "profile-sync" })
          return
        }
        queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] })
      })
  }, [user?.id, profile, events === undefined, collectionPending, snapshotKey])
}

export default useProfileSync
