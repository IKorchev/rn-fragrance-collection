import React from "react"
import { useRouter } from "expo-router"
import { AntDesign } from "@expo/vector-icons"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { useWishlistToggle, type WishlistItem } from "@/lib/queries"
import Card from "./card"

// One "want to try" row: Add moves it into the collection (and off the
// wishlist), a left swipe removes it
const WishlistListItem = ({ item }: { item: WishlistItem }) => {
  const router = useRouter()
  const { user, addFragranceToCollection } = useAuth()
  const { t } = useLocale()
  const toggle = useWishlistToggle(user?.id)
  const [brand, ...titleParts] = item.name.split(" - ")
  const title = titleParts.join(" - ") || brand

  const remove = () => toggle.mutate({ fragranceId: item.fragrance_id, on: false })

  const moveToCollection = async () => {
    const added = await addFragranceToCollection({
      name: item.name,
      image_url: item.image_url,
      fragrance_id: item.fragrance_id,
    })
    if (added) remove()
  }

  const openDetail = () =>
    router.push({
      pathname: "/fragrance-detail",
      params: {
        name: item.name,
        ...(item.image_url ? { imageUrl: item.image_url } : {}),
        fragranceId: item.fragrance_id,
      },
    })

  return (
    <Card.Root
      onPress={openDetail}
      swipeActions={
        <Card.ActionButton
          variant='delete'
          onPress={remove}
          accessibilityLabel={t("wishlist.removeLabel", { name: title })}>
          {(iconColor) => <AntDesign name='delete' color={iconColor} size={18} />}
        </Card.ActionButton>
      }
      accessibilityActions={[{ name: "delete", label: t("wishlist.remove") }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "delete") remove()
      }}>
      <Card.Thumbnail imageUrl={item.image_url} />
      <Card.Content>
        <Card.Title>{title}</Card.Title>
        {titleParts.length > 0 && <Card.Subtitle>{brand}</Card.Subtitle>}
      </Card.Content>
      <Card.ActionPill
        label={t("wishlist.add")}
        className='mr-3'
        accessibilityLabel={t("wishlist.addLabel", { name: title })}
        onPress={moveToCollection}
      />
    </Card.Root>
  )
}

export default WishlistListItem
