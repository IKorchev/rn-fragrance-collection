import React from "react"
import { useRouter } from "expo-router"
import { AntDesign } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import Card from "./card"
import { Text } from "react-native"

interface TopListItemProps {
  name: string
  place?: number | null
  imageUrl?: string | null
  // Community wear count — present for most-worn leaderboard rows
  wearCount?: number | null
  // Catalog fragrances.id — present for search results and FK'd leaderboard rows
  fragranceId?: string | null
}

const TopListItem = ({ name, place, imageUrl, wearCount, fragranceId }: TopListItemProps) => {
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
      },
    })

  return (
    <Card.Root onPress={openDetail}>
      {place != null && <Card.Rank place={place} />}
      <Card.Thumbnail imageUrl={imageUrl} />
      <Card.Content>
        <Card.Title>{title}</Card.Title>
        <Card.Subtitle>{brand}</Card.Subtitle>
        <Card.WearInfoText timesWorn={wearCount || 0} />
      </Card.Content>
      <Card.ActionButton variant='wear' className='mr-3' onPress={handleAddFragrance}>
        {(iconColor) => <AntDesign name='plus' color={iconColor} size={22} />}
      </Card.ActionButton>
    </Card.Root>
  )
}

export default TopListItem
