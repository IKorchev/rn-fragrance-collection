import React, { useEffect, useRef, useState } from "react"
import { Image } from "expo-image"
import { ScrollView, View, Text, TouchableOpacity } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import { useFragranceRatings, useMyRating } from "@/lib/queries"
import Card from "@/components/card"
import TextField from "@/components/shared/ui/text-field"
import TagInput from "@/components/tag-input"

// Param-driven for display data: the catalog only holds name/brand/image (all
// other scraped metadata was dropped as untrustworthy), so there's nothing to
// fetch. Collection rows additionally pass their `id`, which resolves the live
// row from the collection query — that unlocks the editable personal
// rating/notes below and keeps wear stats fresh after a wear.
const FragranceDetailScreen = () => {
  const params = useLocalSearchParams<{
    id?: string
    name: string
    imageUrl?: string
    timesWorn?: string
    lastWorn?: string
    fragranceId?: string
  }>()
  const { modalColors, mutedColors, baseBorderClass, baseTextClass, mutedTextClass } = useTheme()
  const { user, userCollection, updateFragrance, rateFragrance } = useAuth()

  const collectionItem = params.id
    ? userCollection.find((el) => el.id === params.id)
    : undefined

  const name = collectionItem?.name ?? params.name ?? ""
  const brand = name.split(" - ")[0]
  const title = name.split(" - ").slice(1).join(" - ")
  const imageUrl = collectionItem?.image_url ?? params.imageUrl
  const timesWorn = collectionItem?.times_worn ?? (params.timesWorn ? parseInt(params.timesWorn) : 0)
  const lastWorn = collectionItem?.last_worn ?? params.lastWorn

  // Present for catalog-linked collection rows and for rows opened from
  // search/leaderboard (no collection row at all) — absent only for manual
  // adds, which keep rating on user_fragrances instead of this shared table.
  const fragranceId = collectionItem?.fragrance_id ?? params.fragranceId ?? null
  const isManual = !!collectionItem && !collectionItem.fragrance_id

  const { data: ratingsMap } = useFragranceRatings(fragranceId ? [fragranceId] : [])
  const community = fragranceId ? ratingsMap?.[fragranceId] : undefined
  const { data: myRating } = useMyRating(
    user?.id,
    collectionItem && fragranceId ? fragranceId : undefined
  )
  const currentRating = isManual ? (collectionItem?.rating ?? null) : (myRating ?? null)

  const [notes, setNotes] = useState(collectionItem?.notes ?? "")

  const saveRating = (star: number) => {
    if (!collectionItem) return
    // Tapping the current rating clears it
    const rating = currentRating === star ? null : star
    if (isManual) {
      updateFragrance({ id: collectionItem.id }, { rating })
    } else if (fragranceId) {
      rateFragrance(fragranceId, rating)
    }
  }

  const saveNotes = () => {
    if (!collectionItem) return
    const trimmed = notes.trim()
    if ((collectionItem.notes ?? "") === trimmed) return
    updateFragrance({ id: collectionItem.id }, { notes: trimmed || null })
  }

  // Swiping the formSheet down skips blur — flush unsaved notes on unmount
  const saveNotesRef = useRef(saveNotes)
  saveNotesRef.current = saveNotes
  useEffect(() => () => saveNotesRef.current(), [])

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-6 pb-12'
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'>
      {imageUrl ? (
        // White backing keeps product shots (white backgrounds) from clashing in dark mode
        <View className='self-center h-48 w-48 items-center justify-center bg-white rounded-2xl'>
          <Image
            style={{ height: 160, width: 160 }}
            contentFit='contain'
            transition={150}
            source={{ uri: imageUrl }}
          />
        </View>
      ) : (
        <View className={`self-center h-48 w-48 items-center justify-center rounded-2xl border ${baseBorderClass}`}>
          <MaterialCommunityIcons name='image-off' size={40} color={getColor(mutedColors)} />
        </View>
      )}

      <Card.Title centered>{title}</Card.Title>
      <Card.Subtitle centered>{brand}</Card.Subtitle>
      <Card.WearInfoText
        timesWorn={timesWorn}
        lastWorn={lastWorn}
        centered
        avgRating={community?.avg}
        ratingCount={community?.count}
      />

      {collectionItem && (
        <>
          <View className='flex-row justify-center pt-5' style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => saveRating(star)} hitSlop={6}>
                <MaterialCommunityIcons
                  name={(currentRating ?? 0) >= star ? "star" : "star-outline"}
                  size={30}
                  color={
                    (currentRating ?? 0) >= star
                      ? getColor("amber-400")
                      : getColor(mutedColors)
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>Tags</Text>
          <TagInput
            tags={collectionItem.tags}
            onChange={(tags) => updateFragrance({ id: collectionItem.id }, { tags })}
          />

          <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>Notes</Text>
          <TextField
            value={notes}
            onChangeText={setNotes}
            onEndEditing={saveNotes}
            onBlur={saveNotes}
            multiline
            maxLength={2000}
            minHeightClass='min-h-[96px]'
            placeholder='Your impressions — occasions, seasons, projection…'
          />
          <Text className={`${mutedTextClass} text-xs pt-1 text-right`}>
            Saved automatically
          </Text>
        </>
      )}
    </ScrollView>
  )
}

export default FragranceDetailScreen
