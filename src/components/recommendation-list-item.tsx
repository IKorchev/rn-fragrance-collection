import React from "react"
import { Text } from "react-native"
import { useRouter } from "expo-router"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import type { FragranceRecommendation } from "@/lib/queries"
import Card from "./card"

const RecommendationListItem = ({ item }: { item: FragranceRecommendation }) => {
  const router = useRouter()
  const { addFragranceToCollection } = useAuth()
  const { accentTextClass } = useTheme()
  const name = `${item.brand} - ${item.title}`

  const openDetail = () =>
    router.push({
      pathname: "/fragrance-detail",
      params: {
        name,
        fragranceId: item.fragrance_id,
        ...(item.image_url ? { imageUrl: item.image_url } : {}),
      },
    })

  const add = () =>
    addFragranceToCollection({
      name,
      image_url: item.image_url,
      fragrance_id: item.fragrance_id,
    })

  return (
    <Card.Root onPress={openDetail}>
      <Card.Thumbnail imageUrl={item.image_url} />
      <Card.Content>
        <Card.Title>{item.title}</Card.Title>
        <Card.Subtitle>{item.brand}</Card.Subtitle>
        <Text numberOfLines={1} className={`${accentTextClass} text-xs pt-0.5`}>
          {item.reason}
        </Text>
      </Card.Content>
      <Card.ActionPill label='Add' className='mr-3' onPress={add} />
    </Card.Root>
  )
}

export default RecommendationListItem
