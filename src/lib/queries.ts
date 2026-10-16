import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { supabase } from "./supabase"
import type { Database, Tables } from "./database.types"
import { reportError } from "./sentry"
import { getNotificationPermission } from "./notifications"
import { readBlockedUserLabels, type BlockedUserLabel } from "./blocked-user-labels"
import { deviceTimeZone } from "./utils/worn-today"

// The catalog is name/brand/image only — all other scraped Parfumo metadata
// (ratings, votes, year, gender, notes, …) was dropped as untrustworthy
// (see CLAUDE.md on note poisoning).


export const VOTE_SEASONS = ["spring", "summer", "autumn", "winter"] as const
export type VoteSeason = (typeof VOTE_SEASONS)[number]
export const VOTE_GENDERS = ["female", "unisex", "male"] as const
export type VoteGender = (typeof VOTE_GENDERS)[number]
export type VoteScale = 1 | 2 | 3 | 4 | 5

export interface FragranceVote {
  seasons: VoteSeason[]
  gender: VoteGender
  sillage: VoteScale
  longevity: VoteScale
}

export interface FragranceVoteSummary {
  total_votes: number
  seasons: Record<VoteSeason, number>
  genders: Record<VoteGender, number>
  sillage: number[]
  longevity: number[]
  my_vote: FragranceVote | null
}


export type CatalogFragrance =
  Database["public"]["Functions"]["search_fragrances"]["Returns"][number]

export type BrandFacet = Database["public"]["Functions"]["list_brands"]["Returns"][number]

export type TopWornFragrance =
  Database["public"]["Functions"]["top_worn_fragrances"]["Returns"][number]

export type FragranceRecommendation =
  Database["public"]["Functions"]["recommend_fragrances"]["Returns"][number]

export type WearEvent = Tables<"wear_events">

export type StreakSave = Tables<"streak_saves">

export type UserProfile = Tables<"user_profiles">

// SQLSTATE raised by the user_profiles guard trigger when the owner tries to
// re-publish a profile a moderator hid (moderation_hidden_at is set)
export const PROFILE_HIDDEN_ERROR_CODE = "WH001"

export type UserTopWornFragrance =
  Database["public"]["Functions"]["user_top_worn"]["Returns"][number]

export type PendingSubmission =
  Database["public"]["Functions"]["list_pending_submissions"]["Returns"][number]

export type PendingFragranceReport =
  Database["public"]["Functions"]["list_fragrance_reports"]["Returns"][number]

// Catalog feedback reasons (src/app/report-fragrance.tsx). Kept in sync with
// the fragrance_reports_reason_valid CHECK constraint in db/schema.sql.
export const REPORT_REASONS = [
  { key: "wrong_image", labelKey: "reportFragrance.reasons.wrongImage" },
  { key: "duplicate", labelKey: "reportFragrance.reasons.duplicate" },
  { key: "incorrect_name_or_brand", labelKey: "reportFragrance.reasons.incorrectNameOrBrand" },
  { key: "other", labelKey: "reportFragrance.reasons.other" },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]["key"]

export const reportReasonLabelKey = (reason: string) =>
  REPORT_REASONS.find((r) => r.key === reason)?.labelKey

export type PendingProfileReport =
  Database["public"]["Functions"]["list_profile_reports"]["Returns"][number]

// Public-profile report reasons (src/app/report-profile.tsx). Kept in sync
// with the profile_reports_reason_valid CHECK constraint in db/schema.sql.
// labelKey is an i18n key (src/lib/i18n/locales/en.ts).
export const PROFILE_REPORT_REASONS = [
  { key: "offensive_name", labelKey: "reportProfile.reasons.offensiveName" },
  { key: "offensive_photo", labelKey: "reportProfile.reasons.offensivePhoto" },
  { key: "harassment_or_spam", labelKey: "reportProfile.reasons.harassmentOrSpam" },
  { key: "other", labelKey: "reportProfile.reasons.other" },
] as const

export type ProfileReportReason = (typeof PROFILE_REPORT_REASONS)[number]["key"]

export const profileReportReasonLabelKey = (reason: string) =>
  PROFILE_REPORT_REASONS.find((r) => r.key === reason)?.labelKey

// submit_profile_report's 20-pending cap (RAISE EXCEPTION text, no SQLSTATE)
export const isTooManyReportsError = (error: unknown) =>
  typeof (error as { message?: unknown })?.message === "string" &&
  (error as { message: string }).message.includes("too many pending reports")

export type BlockedUser = { blockedId: string; createdAt: string } & BlockedUserLabel



export const useFragranceVoteSummary = (userId: string | undefined, fragranceId: string | null) =>
  useQuery({
    queryKey: ["fragrance-vote-summary", userId, fragranceId],
    enabled: !!userId && !!fragranceId,
    queryFn: async (): Promise<FragranceVoteSummary> => {
      const { data, error } = await supabase.rpc("get_fragrance_vote_summary", {
        p_fragrance_id: fragranceId!,
      })
      if (error) {
        reportError(error, { flow: "fragrance-vote-summary" })
        throw error
      }
      const summary = data as FragranceVoteSummary | null
      return summary ?? {
        total_votes: 0,
        seasons: { spring: 0, summer: 0, autumn: 0, winter: 0 },
        genders: { female: 0, unisex: 0, male: 0 },
        sillage: [0, 0, 0, 0, 0],
        longevity: [0, 0, 0, 0, 0],
        my_vote: null,
      }
    },
  })

export const useFragranceVoteMutation = (userId: string | undefined, fragranceId: string | null) => {
  const queryClient = useQueryClient()
  const queryKey = ["fragrance-vote-summary", userId, fragranceId]
  return useMutation({
    mutationFn: async (vote: FragranceVote | null) => {
      if (!userId || !fragranceId) throw new Error("A signed-in catalog fragrance is required")
      if (vote) {
        const { error } = await supabase.from("fragrance_votes").upsert(
          { user_id: userId, fragrance_id: fragranceId, ...vote },
          { onConflict: "user_id,fragrance_id" }
        )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("fragrance_votes")
          .delete()
          .eq("user_id", userId)
          .eq("fragrance_id", fragranceId)
        if (error) throw error
      }
    },
    onError: (error) => reportError(error, { flow: "fragrance-vote-mutation" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })
}

// Community rating aggregate for one catalog fragrance, keyed for lookup
export interface RatingSummary {
  avg: number
  count: number
}

export const MIN_SEARCH_LENGTH = 3

export const WEAR_PERIODS = [
  { key: "day", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All Time" },
] as const

export type WearPeriod = (typeof WEAR_PERIODS)[number]["key"]

export interface SearchFilters {
  brand: string | null
}

export const hasActiveFilters = (filters: SearchFilters) => filters.brand !== null

// Facet lists only change when the catalog is re-scraped
const FACET_STALE_TIME = 24 * 60 * 60 * 1000

// Community leaderboard: top 100 most-worn fragrances per period. Every
// period counts wear_events ('all' is just unbounded), so deleted collection
// rows keep their wears.
export const useTopWorn = (period: WearPeriod) =>
  useQuery({
    queryKey: ["top-worn", period],
    queryFn: async (): Promise<TopWornFragrance[]> => {
      const { data, error } = await supabase.rpc("top_worn_fragrances", {
        period,
        max_results: 100,
      })
      if (error) throw error
      return data ?? []
    },
  })

// One authenticated server endpoint owns candidate generation, aggregate
// lookup, scoring, exclusion, explanations, and diversification. Gating on
// collectionReady prevents the empty-collection cold query from racing the
// real personalized query during startup.
export const useRecommendations = (userId: string | undefined, collectionReady: boolean) =>
  useQuery({
    queryKey: ["recommendations", userId],
    enabled: !!userId && collectionReady,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<FragranceRecommendation[]> => {
      const { data, error } = await supabase.rpc("recommend_fragrances", {
        max_results: 20,
      })
      if (error) throw error
      return data ?? []
    },
  })

// Most recent raw wear events (name/image are per-event snapshots, so history
// survives collection-row deletion), capped at 500 — fine for the
// recent-window readers (heatmap, this-month stat, monthly recap), but never
// a source of all-time totals: badges/streaks read useWearSummary and the
// diary pages through useWearDiary. RLS already scopes reads to own rows; the
// explicit user_id filter just keeps the query honest and the cache keyed per
// user. Newest first.
export const useWearHistory = (userId: string | undefined) =>
  useQuery({
    queryKey: ["wear-history", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WearEvent[]> => {
      const { data, error } = await supabase
        .from("wear_events")
        .select("*")
        .eq("user_id", userId!)
        .order("worn_at", { ascending: false })
        .limit(500)
      if (error) throw error
      return data ?? []
    },
  })

// The generated type calls user_fragrance_id non-null; it's NULL once the
// collection row is deleted (ON DELETE SET NULL)
export type WearSummaryRow = Omit<
  Database["public"]["Functions"]["wear_summary"]["Returns"][number],
  "user_fragrance_id"
> & { user_fragrance_id: string | null }

// Uncapped per-scent aggregate of the user's whole wear history (the
// wear_summary RPC) — feeds badges/streaks (wearStatsFromSummary in
// src/lib/gamification) and the diary's header stats + filter facets. Keyed
// under "wear-history" so the existing wear/undo invalidation covers it.
export const useWearSummary = (userId: string | undefined) =>
  useQuery({
    queryKey: ["wear-history", "summary", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WearSummaryRow[]> => {
      const { data, error } = await supabase.rpc("wear_summary", { p_tz: deviceTimeZone })
      if (error) throw error
      return data ?? []
    },
  })

export interface WearDiaryFilters {
  search: string
  // null = no filter; [] = filter that matches nothing
  names: string[] | null
  userFragranceIds: string[] | null
}

const WEAR_DIARY_PAGE_SIZE = 50

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&")
// PostgREST list literal with every value double-quoted, so names containing
// commas, parentheses, quotes or backslashes survive (postgrest-js's own
// .in() only quotes the first three)
const postgrestList = (values: string[]) =>
  `(${values.map((v) => `"${v.replace(/["\\]/g, "\\$&")}"`).join(",")})`

// The wear diary, newest first, paged by worn_at keyset (stable while new
// wears land mid-scroll). Filters run server-side so a filtered diary still
// reaches every matching entry, not just the loaded pages.
export const useWearDiary = (userId: string | undefined, filters: WearDiaryFilters) =>
  useInfiniteQuery({
    queryKey: ["wear-history", "diary", userId, filters],
    enabled: !!userId,
    placeholderData: keepPreviousData, // filter changes don't blank the list/header
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<WearEvent[]> => {
      if (filters.names?.length === 0 || filters.userFragranceIds?.length === 0) return []
      let query = supabase.from("wear_events").select("*").eq("user_id", userId!)
      if (pageParam) query = query.lt("worn_at", pageParam)
      const needle = filters.search.trim()
      if (needle) query = query.ilike("name", `%${escapeLike(needle)}%`)
      if (filters.names) query = query.filter("name", "in", postgrestList(filters.names))
      if (filters.userFragranceIds) {
        query = query.filter("user_fragrance_id", "in", postgrestList(filters.userFragranceIds))
      }
      const { data, error } = await query
        .order("worn_at", { ascending: false })
        .limit(WEAR_DIARY_PAGE_SIZE)
      if (error) throw error
      return data ?? []
    },
    getNextPageParam: (lastPage) =>
      lastPage.length < WEAR_DIARY_PAGE_SIZE ? undefined : lastPage[lastPage.length - 1].worn_at,
  })

// Community rating average + count for a batch of catalog fragrance ids —
// one call for a whole page of search/leaderboard rows instead of N+1.
// Ids with no ratings yet are simply absent from the returned map.
export const useFragranceRatings = (fragranceIds: (string | null | undefined)[]) => {
  const ids = Array.from(new Set(fragranceIds.filter((id): id is string => !!id))).sort()

  return useQuery({
    queryKey: ["fragrance-ratings", ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Record<string, RatingSummary>> => {
      const { data, error } = await supabase.rpc("get_fragrance_ratings", {
        fragrance_ids: ids,
      })
      if (error) throw error
      return Object.fromEntries(
        (data ?? []).map((r) => [r.fragrance_id, { avg: r.avg_rating, count: Number(r.rating_count) }])
      )
    },
  })
}

// The signed-in user's own rating for a catalog-linked fragrance (the detail
// sheet's star widget for catalog items — manual adds use user_fragrances.rating
// directly instead, since they have no fragrance_id to key this table on).
export const useMyRating = (userId: string | undefined, fragranceId: string | undefined) =>
  useQuery({
    queryKey: ["my-rating", userId, fragranceId],
    enabled: !!userId && !!fragranceId,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from("fragrance_ratings")
        .select("rating")
        .eq("user_id", userId!)
        .eq("fragrance_id", fragranceId!)
        .maybeSingle()
      if (error) throw error
      return data?.rating ?? null
    },
  })

// All of the signed-in user's catalog ratings, keyed by fragrance id — the
// collection-wide counterpart of useMyRating, for code that needs "my rating"
// for every bottle at once (see use-rated-collection.ts).
export const useMyRatings = (userId: string | undefined) =>
  useQuery({
    queryKey: ["my-ratings", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("fragrance_ratings")
        .select("fragrance_id, rating")
        .eq("user_id", userId!)
      if (error) throw error
      return Object.fromEntries((data ?? []).map((row) => [row.fragrance_id, row.rating]))
    },
  })

// Whether daily wear reminders are enabled for this user's devices (profile
// toggle). No token rows means no device can receive one yet, so that reads
// as off.
export const useRemindersEnabled = (userId: string | undefined) =>
  useQuery({
    queryKey: ["reminder-prefs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("user_push_tokens")
        .select("reminders_enabled")
        .eq("user_id", userId!)
      if (error) throw error
      return (data ?? []).length > 0 && (data ?? []).every((row) => row.reminders_enabled)
    },
  })

// This device's OS notification permission. staleTime 0 so returning from
// the Settings app (a foreground event, see query-client.ts) re-reads it.
export const useNotificationPermission = () =>
  useQuery({
    queryKey: ["notification-permission"],
    staleTime: 0,
    queryFn: getNotificationPermission,
  })

// Live catalog search (search_fragrances RPC): ranked text match when a term
// is present, browse mode (by brand) when only the brand filter is active
export const useFragranceSearch = (term: string, filters: SearchFilters) => {
  const trimmed = term.trim()
  const hasTerm = trimmed.length >= MIN_SEARCH_LENGTH

  return useQuery({
    queryKey: ["search", hasTerm ? trimmed : "", filters.brand],
    enabled: hasTerm || hasActiveFilters(filters),
    placeholderData: keepPreviousData, // no result-list flicker while typing
    queryFn: async (): Promise<CatalogFragrance[]> => {
      const { data, error } = await supabase.rpc("search_fragrances", {
        search_term: hasTerm ? trimmed : undefined,
        filter_brand: filters.brand ?? undefined,
        max_results: 50,
      })
      if (error) throw error
      return data ?? []
    },
  })
}

// Membership check for the in-app moderation screen's entry point (Profile tab)
// — reads the moderators table directly (RLS: "own membership" SELECT
// policy). Enforcement for the actual review actions lives in the RPCs, not
// this check — a non-moderator hitting the screen just gets an RPC error.
export const useIsModerator = (userId: string | undefined) =>
  useQuery({
    queryKey: ["is-moderator", userId],
    enabled: !!userId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("moderators")
        .select("user_id")
        .eq("user_id", userId!)
        .maybeSingle()
      if (error) throw error
      return !!data
    },
  })

// Pending catalog-suggestion queue (moderation screen). RLS only exposes a
// user's own fragrance_submissions rows, so this goes through the
// moderator-gated list_pending_submissions RPC instead of a direct select.
export const usePendingSubmissions = (enabled: boolean) =>
  useQuery({
    queryKey: ["pending-submissions"],
    enabled,
    queryFn: async (): Promise<PendingSubmission[]> => {
      const { data, error } = await supabase.rpc("list_pending_submissions")
      if (error) throw error
      return data ?? []
    },
  })

// Pending catalog-issue reports (moderation screen's Reports tab). Same
// shape as usePendingSubmissions: RLS only exposes a user's own
// fragrance_reports rows, so this goes through the moderator-gated
// list_fragrance_reports RPC instead of a direct select.
export const usePendingFragranceReports = (enabled: boolean) =>
  useQuery({
    queryKey: ["pending-reports"],
    enabled,
    queryFn: async (): Promise<PendingFragranceReport[]> => {
      const { data, error } = await supabase.rpc("list_fragrance_reports")
      if (error) throw error
      return data ?? []
    },
  })

// Pending public-profile reports (moderation screen's Profiles tab) — same
// moderator-gated RPC read as usePendingFragranceReports.
export const usePendingProfileReports = (enabled: boolean) =>
  useQuery({
    queryKey: ["pending-profile-reports"],
    enabled,
    queryFn: async (): Promise<PendingProfileReport[]> => {
      const { data, error } = await supabase.rpc("list_profile_reports")
      if (error) throw error
      return data ?? []
    },
  })

// The signed-in user's blocks, newest first, merged with the device-local
// name snapshot from src/lib/blocked-user-labels.ts (RLS hides a blocked
// user's profile row from the blocker, so it can't be joined server-side).
export const useBlockedUsers = (userId: string | undefined) =>
  useQuery({
    queryKey: ["blocked-users", userId],
    enabled: !!userId,
    queryFn: async (): Promise<BlockedUser[]> => {
      const [{ data, error }, labels] = await Promise.all([
        supabase
          .from("user_blocks")
          .select("blocked_id, created_at")
          .eq("blocker_id", userId!)
          .order("created_at", { ascending: false }),
        readBlockedUserLabels(),
      ])
      if (error) throw error
      return (data ?? []).map((row) => ({
        blockedId: row.blocked_id,
        createdAt: row.created_at,
        displayName: labels[row.blocked_id]?.displayName ?? null,
        avatarUrl: labels[row.blocked_id]?.avatarUrl ?? null,
      }))
    },
  })

// Complete wear history for the data-export screen (src/app/export-data.tsx)
// — no 500-row cap like useWearHistory's recent-window list, since export should be
// as complete as practical; capped at 2000 as a disclosed ceiling (keeps the
// shared-as-text payload well under Android's binder transaction limit).
// A separate query key from useWearHistory's so the diary view's cache
// isn't disturbed by the larger limit.
export const useWearHistoryExport = (userId: string | undefined) =>
  useQuery({
    queryKey: ["wear-history-export", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WearEvent[]> => {
      const { data, error } = await supabase
        .from("wear_events")
        .select("*")
        .eq("user_id", userId!)
        .order("worn_at", { ascending: false })
        .limit(2000)
      if (error) throw error
      return data ?? []
    },
  })

// Streak Saver saves (Pro perk — see streak_saves in db/schema.sql). RLS
// already scopes reads to own rows; the explicit user_id filter just keeps
// the cache keyed per user. Consumed by use-gamification.ts (converted to
// Date.toDateString() keys and passed as computeStreak's freezeDates) and
// use-streak-save-budget.ts (the "N left this month" footer).
export const useStreakSaves = (userId: string | undefined) =>
  useQuery({
    queryKey: ["streak-saves", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StreakSave[]> => {
      const { data, error } = await supabase
        .from("streak_saves")
        .select("*")
        .eq("user_id", userId!)
      if (error) throw error
      return data ?? []
    },
  })

// The signed-in user's own profile row (null until they've ever toggled
// public or uploaded a header photo — the row is created lazily by the first
// write). Owns the header photo path and the is_public flag; the snapshot
// fields on it are kept fresh by use-profile-sync.ts.
export const useMyProfile = (userId: string | undefined) =>
  useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

// Another user's profile — RLS only returns the row while is_public, so a
// user flipping private disappears here on next fetch. null = private or
// nonexistent (indistinguishable on purpose).
export const usePublicProfile = (userId: string | undefined) =>
  useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

// Top-collectors leaderboard: public profiles ranked by XP. A plain select —
// the "public or own profile" RLS policy is the gate, no RPC needed.
export const useTopCollectors = () =>
  useQuery({
    queryKey: ["top-collectors"],
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("is_public", true)
        .order("total_wears", { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  })

// A public user's most-worn fragrances, from their real wear_events via the
// user_top_worn SECURITY DEFINER RPC (empty for private profiles).
export const useUserTopWorn = (userId: string | undefined) =>
  useQuery({
    queryKey: ["user-top-worn", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserTopWornFragrance[]> => {
      const { data, error } = await supabase.rpc("user_top_worn", {
        target_user: userId!,
        max_results: 5,
      })
      if (error) throw error
      return data ?? []
    },
  })

// Fetched once and filtered client-side — the brand facet list is small and
// changes only on a catalog re-scrape
export const useBrands = () =>
  useQuery({
    queryKey: ["brands"],
    staleTime: FACET_STALE_TIME,
    queryFn: async (): Promise<BrandFacet[]> => {
      const { data, error } = await supabase.rpc("list_brands")
      if (error) throw error
      return data ?? []
    },
  })

// "Want to try" list — catalog-only, name/image read through the fragrances
// embed. Names are composed to the same "Brand - Title" shape as collection rows
export interface WishlistItem {
  id: string
  fragrance_id: string
  created_at: string
  name: string
  image_url: string | null
}

export const useWishlist = (userId: string | undefined) =>
  useQuery({
    queryKey: ["wishlist", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WishlistItem[]> => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, fragrance_id, created_at, fragrances(name, brand, image_url)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        fragrance_id: row.fragrance_id,
        created_at: row.created_at,
        name: row.fragrances ? `${row.fragrances.brand} - ${row.fragrances.name}` : "",
        image_url: row.fragrances?.image_url ?? null,
      }))
    },
  })

// name/imageUrl only feed the optimistic row
export interface WishlistToggleInput {
  fragranceId: string
  on: boolean
  name?: string
  imageUrl?: string | null
}

// Adds or removes one catalog fragrance; optimistic so the detail sheet's
// toggle flips instantly, rolled back if the write fails
export const useWishlistToggle = (userId: string | undefined) => {
  const queryClient = useQueryClient()
  const queryKey = ["wishlist", userId]
  return useMutation({
    mutationFn: async (input: WishlistToggleInput) => {
      if (!userId) throw new Error("Signed-in user required")
      const { error } = input.on
        ? await supabase
            .from("wishlist_items")
            .upsert(
              { user_id: userId, fragrance_id: input.fragranceId },
              { onConflict: "user_id,fragrance_id", ignoreDuplicates: true }
            )
        : await supabase
            .from("wishlist_items")
            .delete()
            .eq("user_id", userId)
            .eq("fragrance_id", input.fragranceId)
      if (error) throw error
    },
    onMutate: async (input: WishlistToggleInput) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<WishlistItem[]>(queryKey)
      queryClient.setQueryData<WishlistItem[]>(queryKey, (old = []) =>
        input.on
          ? [
              {
                id: `optimistic-${input.fragranceId}`,
                fragrance_id: input.fragranceId,
                created_at: new Date().toISOString(),
                name: input.name ?? "",
                image_url: input.imageUrl ?? null,
              },
              ...old.filter((item) => item.fragrance_id !== input.fragranceId),
            ]
          : old.filter((item) => item.fragrance_id !== input.fragranceId)
      )
      return { previous }
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
      reportError(error, { flow: "wishlist-toggle" })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
