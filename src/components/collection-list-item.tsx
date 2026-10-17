import React from "react"
import { useRouter } from "expo-router"
import { Text } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import { getColor } from "@/lib/utils/colors"
import { isWornToday } from "@/lib/utils/worn-today"
import Card from "./card"

interface CollectionListItemProps {
  id: string
  name: string
  imageUrl: string | null
  timesWorn: number
  lastWorn: string | null
  bottleType: string | null
  runningLow: boolean
}

const CollectionListItem = ({
  id,
  name,
  imageUrl,
  timesWorn,
  lastWorn,
  bottleType,
  runningLow,
}: CollectionListItemProps) => {
  const router = useRouter()
  const { incrementWear, requestDelete, cancelDelete } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const [brand, title] = name.split(" - ")
  const displayTitle = title ?? name

  const handleDelete = () => {
    requestDelete({ id })
    showToast({
      message: t("actions.deleted", { name: displayTitle }),
      actionLabel: t("actions.undo"),
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
        <Card.ActionButton
          variant='delete'
          onPress={handleDelete}
          accessibilityLabel={t("actions.deleteLabel", { name: displayTitle })}>
          {(iconColor) => <AntDesign name='delete' color={iconColor} size={18} />}
        </Card.ActionButton>
      }
      accessibilityActions={[{ name: "delete", label: t("actions.delete") }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "delete") handleDelete()
      }}>
      <Card.Thumbnail imageUrl={imageUrl} />
      <Card.Content>
        <Card.Title>{title}</Card.Title>
        <Card.Subtitle>
          {brand}
          {/* A full bottle is the unremarkable default, so only decants/samples are called out */}
          {bottleType === "decant" || bottleType === "sample" ? ` · ${t(`detail.bottleTypes.${bottleType}`)}` : ""}
          {runningLow && <Text style={{ color: getColor("amber-600") }}>{` · ${t("detail.runningLow")}`}</Text>}
        </Card.Subtitle>
        <Card.WearInfoText timesWorn={timesWorn} lastWorn={lastWorn} />
      </Card.Content>
      {/* Flips to "✓ Worn" once worn today (one wear per day) — still
          tappable, the increment_wear round-trip shows the "already worn" toast */}
      <Card.ActionPill
        label={t("actions.wear")}
        className='mr-3'
        testID='wear-button'
        accessibilityLabel={t("actions.wearLabel", { name: displayTitle })}
        worn={isWornToday(lastWorn)}
        onPress={() => incrementWear({ id })}
      />
    </Card.Root>
  )
}

export default CollectionListItem
