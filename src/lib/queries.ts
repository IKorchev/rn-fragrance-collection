import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { supabase } from "./supabase"
import type { Database, Tables } from "./database.types"

// The catalog is name/brand/image only — all other scraped Parfumo metadata
// (ratings, votes, year, gender, notes, …) was dropped as untrustworthy
// (see CLAUDE.md on note poisoning).
export type CatalogFragrance =
  Database["public"]["Functions"]["search_fragrances"]["Returns"][number]

export type BrandFacet = Database["public"]["Functions"]["list_brands"]["Returns"][number]

export type TopWornFragrance =
  Database["public"]["Functions"]["top_worn_fragrances"]["Returns"][number]

export type WearEvent = Tables<"wear_events">

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

// Personal wear diary (name/image are per-event snapshots, so history survives
// collection-row deletion). RLS already scopes reads to own rows; the explicit
// user_id filter just keeps the query honest and the cache keyed per user.
// Newest first — the history screen groups these by calendar day.
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

// Whether daily wear reminders are enabled for this user's devices (profile
// toggle). No token rows yet reads as true — that's the default a new token
// row gets on registration.
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
      return (data ?? []).every((row) => row.reminders_enabled)
    },
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

// All 704 brands with counts — fetched once, filtered client-side
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
