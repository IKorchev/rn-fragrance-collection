import React from "react"
import { useRouter } from "expo-router"
import useAuth from "@/contexts/auth-context"
import Card from "./card"

interface TopListItemProps {
  name: string
  place?: number | null
  imageUrl?: string | null
  // Community wear count — present for most-worn leaderboard rows
  wearCount?: number | null
  // Catalog fragrances.id — present for search results and FK'd leaderboard rows
  fragranceId?: string | null
  // Community rating aggregate — batch-fetched by the parent list screen
  avgRating?: number | null
  ratingCount?: number | null
}

const TopListItem = ({
  name,
  place,
  imageUrl,
  wearCount,
  fragranceId,
  avgRating,
  ratingCount,
}: TopListItemProps) => {
  const router = useRouter()
  const { addFragranceToCollection } = useAuth()
  const [brand, title] = name.split(" - ")

  const handleAddFragrance = () =>
    addFragranceToCollection({
      name: name,
      image_url: imageUrl ?? null,
      fragrance_id: fragranceId ?? null,
    })

  const openDetail = () =>
    router.push({
      pathname: "/fragrance-detail",
      params: {
        name,
        ...(imageUrl ? { imageUrl } : {}),
        // Lets the detail sheet resolve the community rating even when this
        // row isn't in the user's collection (no `id` param to key off of)
        ...(fragranceId ? { fragranceId } : {}),
      },
    })

  return (
    <Card.Root onPress={openDetail}>
      {place != null && <Card.Rank place={place} />}
      <Card.Thumbnail imageUrl={imageUrl} />
      <Card.Content>
        <Card.Title>{title}</Card.Title>
        <Card.Subtitle>{brand}</Card.Subtitle>
        <Card.WearInfoText
          community
          timesWorn={wearCount || 0}
          avgRating={avgRating}
          ratingCount={ratingCount}
        />
      </Card.Content>
      <Card.ActionPill label='Add' className='mr-3' onPress={handleAddFragrance} />
    </Card.Root>
  )
}

export default TopListItem
