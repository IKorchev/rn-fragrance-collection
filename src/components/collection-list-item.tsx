import React from "react"
import { useRouter } from "expo-router"
import { AntDesign } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import { isWornToday } from "@/lib/utils/worn-today"
import Card from "./card"

interface CollectionListItemProps {
  id: string
  name: string
  imageUrl: string | null
  timesWorn: number
  lastWorn: string | null
}

const CollectionListItem = ({ id, name, imageUrl, timesWorn, lastWorn }: CollectionListItemProps) => {
  const router = useRouter()
  const { incrementWear, requestDelete, cancelDelete } = useAuth()
  const { showToast } = useToast()
  const [brand, title] = name.split(" - ")

  const handleDelete = () => {
    requestDelete({ id })
    showToast({
      message: `${title} deleted`,
      actionLabel: "Undo",
      onAction: () => cancelDelete(id),
    })
  }

  const openDetail = () =>
    router.push({
      pathname: "/fragrance-detail",
      params: {
        // id lets the detail sheet find the live collection row (editable
        // rating/notes + fresh wear stats); the rest is fallback display data
        id,
        name,
        ...(imageUrl ? { imageUrl } : {}),
        timesWorn: String(timesWorn),
        ...(lastWorn ? { lastWorn } : {}),
      },
    })

  return (
    <Card.Root
      onPress={openDetail}
      // Delete stays behind a left swipe so the row itself stays readable —
      // only the everyday action (Wear) gets a permanent button.
      swipeActions={
        <Card.ActionButton variant='delete' onPress={handleDelete}>
          {(iconColor) => <AntDesign name='delete' color={iconColor} size={18} />}
        </Card.ActionButton>
      }>
      <Card.Thumbnail imageUrl={imageUrl} />
      <Card.Content>
        <Card.Title>{title}</Card.Title>
        <Card.Subtitle>{brand}</Card.Subtitle>
        <Card.WearInfoText timesWorn={timesWorn} lastWorn={lastWorn} />
      </Card.Content>
      {/* Flips to "✓ Worn" once worn today (one wear per day) — still
          tappable, the increment_wear round-trip shows the "already worn" toast */}
      <Card.ActionPill
        label='Wear'
        className='mr-3'
        testID='wear-button'
        worn={isWornToday(lastWorn)}
        onPress={() => incrementWear({ id })}
      />
    </Card.Root>
  )
}

export default CollectionListItem
