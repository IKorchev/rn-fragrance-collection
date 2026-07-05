import { useQuery } from "@tanstack/react-query"
import { supabase } from "./supabase"
import { fetchData } from "./utils/fetch-data"
import type { Tables } from "./database.types"

export type CatalogFragrance = Pick<
  Tables<"fragrances">,
  "id" | "name" | "brand" | "image_url" | "rating" | "votes" | "year" | "gender"
>

export type TopFragrance = Tables<"top_fragrances"> & {
  imageUrl: string | null
  totalVotes: number | null
}

export const CATEGORY_OPTIONS = ["men", "women", "unisex"] as const

export const MIN_SEARCH_LENGTH = 3

// Browseable slice of the fragrance-db catalog for the home screen
export const useCatalog = () =>
  useQuery({
    queryKey: ["catalog"],
    queryFn: async (): Promise<CatalogFragrance[]> => {
      const { data, error } = await supabase
        .from("fragrances")
        .select("id, name, brand, image_url, rating, votes, year, gender")
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  })

// Top 100 lists — one array per category, in CATEGORY_OPTIONS order
export const useTop100 = () =>
  useQuery({
    queryKey: ["top100"],
    queryFn: async (): Promise<TopFragrance[][]> => {
      return Promise.all(
        CATEGORY_OPTIONS.map(async (category) => {
          const { data, error } = await supabase
            .from("top_fragrances")
            .select("*")
            .eq("category", category)
          if (error) throw error
          return (data ?? [])
            // Keep the camelCase field names the list components already use
            .map((row) => ({ ...row, imageUrl: row.image_url, totalVotes: row.total_votes }))
            .sort((el1, el2) => Number(el1.place) - Number(el2.place))
        })
      )
    },
  })

// webscraping-api search — only runs once a long-enough term is submitted
export const useFragranceSearch = (term: string) =>
  useQuery({
    queryKey: ["search", term],
    queryFn: () => fetchData(term),
    enabled: term.trim().length >= MIN_SEARCH_LENGTH,
  })
