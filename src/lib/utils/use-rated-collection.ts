import { useMemo } from "react"
import useAuth, { type UserFragrance } from "@/contexts/auth-context"
import { useMyRatings } from "@/lib/queries"

// A bottle's personal rating lives in one of two places: catalog-linked
// bottles are rated in fragrance_ratings (which also feeds the community
// average), manual adds in user_fragrances.rating. This resolves `rating` the
// same way the detail sheet's stars do, so badges and export see what the
// user actually set.
export const withMyRatings = (
  collection: UserFragrance[],
  myRatings: Record<string, number> | undefined
): UserFragrance[] =>
  collection.map((item) =>
    item.fragrance_id ? { ...item, rating: myRatings?.[item.fragrance_id] ?? null } : item
  )

export const useRatedCollection = (): UserFragrance[] => {
  const { user, userCollection } = useAuth()
  const { data: myRatings } = useMyRatings(user?.id)
  return useMemo(() => withMyRatings(userCollection, myRatings), [userCollection, myRatings])
}

export default useRatedCollection
