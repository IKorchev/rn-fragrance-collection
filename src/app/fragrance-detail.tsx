import React, { useEffect, useRef, useState } from "react"
import { Image } from "expo-image"
import { ScrollView, View, Text, TextInput, TouchableOpacity } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import Card from "@/components/card"

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
  }>()
  const { modalColors, mutedColors, baseColors, baseBorderClass, baseTextClass, mutedTextClass, theme } =
    useTheme()
  const { userCollection, updateFragrance } = useAuth()

  const collectionItem = params.id
    ? userCollection.find((el) => el.id === params.id)
    : undefined

  const name = collectionItem?.name ?? params.name ?? ""
  const brand = name.split(" - ")[0]
  const title = name.split(" - ").slice(1).join(" - ")
  const imageUrl = collectionItem?.image_url ?? params.imageUrl
  const timesWorn = collectionItem?.times_worn ?? (params.timesWorn ? parseInt(params.timesWorn) : 0)
  const lastWorn = collectionItem?.last_worn ?? params.lastWorn

  const [notes, setNotes] = useState(collectionItem?.notes ?? "")

  const saveRating = (star: number) => {
    if (!collectionItem) return
    // Tapping the current rating clears it
    const rating = collectionItem.rating === star ? null : star
    updateFragrance({ id: collectionItem.id }, { rating })
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
      <Card.WearInfoText timesWorn={timesWorn} lastWorn={lastWorn} centered />

      {collectionItem && (
        <>
          <View className='flex-row justify-center pt-5' style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => saveRating(star)} hitSlop={6}>
                <MaterialCommunityIcons
                  name={(collectionItem.rating ?? 0) >= star ? "star" : "star-outline"}
                  size={30}
                  color={
                    (collectionItem.rating ?? 0) >= star
                      ? getColor("amber-400")
                      : getColor(mutedColors)
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onEndEditing={saveNotes}
            onBlur={saveNotes}
            multiline
            maxLength={2000}
            placeholder='Your impressions — occasions, seasons, projection…'
            placeholderTextColor={getColor(mutedColors)}
            className={`rounded-2xl px-4 py-3 min-h-[96px] ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}
            style={{ color: getColor(baseColors), textAlignVertical: "top" }}
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
