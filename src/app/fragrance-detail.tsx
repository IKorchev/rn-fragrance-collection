import React, { useEffect, useMemo, useRef, useState } from "react"
import { Image } from "expo-image"
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Switch,
  type AccessibilityActionEvent,
} from "react-native"
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg"
import { useLocalSearchParams, useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { useFragranceRatings, useMyRating, useWishlist, useWishlistToggle } from "@/lib/queries"
import { formatRelativeDay } from "@/lib/utils/relative-time"
import { buildFragranceShareText } from "@/lib/share"
import Card from "@/components/card"
import Button from "@/components/shared/ui/button"
import PressableScale from "@/components/shared/ui/pressable-scale"
import SegmentedControl from "@/components/shared/ui/segmented-control"
import StatTile from "@/components/shared/ui/stat-tile"
import TextField from "@/components/shared/ui/text-field"
import TagInput from "@/components/tag-input"
import FragranceVoting from "@/components/fragrance-voting"
import ShareSheetModal from "@/components/share-sheet-modal"

// Soft radial glow behind the hero image — same device as SignInBackdrop,
// scaled down to sit just behind the bottle instead of filling the screen.
const HeroGlow = () => {
  const { theme } = useTheme()
  const { width } = useWindowDimensions()
  const dark = theme === "dark"
  const size = width * 1.1
  const glow = getColor(dark ? "emerald-500" : "emerald-400")

  return (
    <Svg
      width={size}
      height={size}
      style={{ position: "absolute", top: -size * 0.32 }}
      pointerEvents='none'>
      <Defs>
        <RadialGradient id='detail-glow'>
          <Stop offset='0' stopColor={glow} stopOpacity={dark ? 0.25 : 0.35} />
          <Stop offset='1' stopColor={glow} stopOpacity='0' />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill='url(#detail-glow)' />
    </Svg>
  )
}

// Param-driven for display data: the catalog only holds name/brand/image (all
// other scraped metadata was dropped as untrustworthy), so there's nothing to
// fetch. Collection rows additionally pass their `id`, which resolves the live
// row from the collection query — that unlocks the editable personal
// rating/notes below and keeps wear stats fresh after a wear.
const BOTTLE_TYPES = ["full", "decant", "sample"] as const
type BottleType = (typeof BOTTLE_TYPES)[number]

const FragranceDetailScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams<{
    id?: string
    name: string
    imageUrl?: string
    timesWorn?: string
    lastWorn?: string
    fragranceId?: string
  }>()
  const { modalColors, mutedColors, baseBorderClass, baseTextClass, mutedTextClass, theme } = useTheme()
  const { user, userCollection, updateFragrance, rateFragrance, addFragranceToCollection } = useAuth()
  const { t } = useLocale()

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
  // Local mirrors so the bottle controls respond before the collection refetch lands
  const [bottleType, setBottleType] = useState<BottleType | null>(
    (collectionItem?.bottle_type as BottleType | null | undefined) ?? null
  )
  const [runningLow, setRunningLow] = useState(collectionItem?.running_low ?? false)

  // Catalog fragrance opened from search/leaderboard/wishlist (no collection row)
  const ownedCatalogRow = fragranceId
    ? userCollection.some((el) => el.fragrance_id === fragranceId)
    : false
  const { data: wishlist } = useWishlist(user?.id)
  const wishlistToggle = useWishlistToggle(user?.id)
  const onWishlist = !!fragranceId && !!wishlist?.some((item) => item.fragrance_id === fragranceId)
  const [adding, setAdding] = useState(false)

  const addToCollection = async () => {
    if (!fragranceId) return
    setAdding(true)
    const added = await addFragranceToCollection({ name, image_url: imageUrl ?? null, fragrance_id: fragranceId })
    setAdding(false)
    if (added && onWishlist) wishlistToggle.mutate({ fragranceId, on: false })
  }

  const toggleWishlist = () => {
    if (!fragranceId) return
    wishlistToggle.mutate({ fragranceId, on: !onWishlist, name, imageUrl: imageUrl ?? null })
  }

  // Tapping the selected type again clears it
  const changeBottleType = (type: BottleType) => {
    if (!collectionItem) return
    const next = bottleType === type ? null : type
    setBottleType(next)
    updateFragrance({ id: collectionItem.id }, { bottle_type: next })
  }

  const changeRunningLow = (value: boolean) => {
    if (!collectionItem) return
    setRunningLow(value)
    updateFragrance({ id: collectionItem.id }, { running_low: value })
  }

  // Share sheet: privacy-safe by default (name only) — times-worn/rating are
  // the user's own personal data and only ride along once they flip the
  // toggle, never on by default. Notes/price/user id are never offered at all.
  const [shareVisible, setShareVisible] = useState(false)
  const [includeTimesWorn, setIncludeTimesWorn] = useState(false)
  const [includeRating, setIncludeRating] = useState(false)
  const shareMessage = useMemo(
    () =>
      buildFragranceShareText(
        t,
        { name, timesWorn, rating: currentRating },
        { includeTimesWorn, includeRating: includeRating && currentRating != null }
      ),
    [t, name, timesWorn, currentRating, includeTimesWorn, includeRating]
  )
  const shareToggles = [
    timesWorn > 0 && {
      key: "timesWorn",
      label: t("share.includeTimesWorn"),
      value: includeTimesWorn,
      onChange: setIncludeTimesWorn,
    },
    currentRating != null && {
      key: "rating",
      label: t("share.includeRating"),
      value: includeRating,
      onChange: setIncludeRating,
    },
  ].filter((toggle): toggle is Exclude<typeof toggle, false> => toggle !== false)

  const setRating = (rating: number | null) => {
    if (!collectionItem || rating === currentRating) return
    if (isManual) {
      updateFragrance({ id: collectionItem.id }, { rating })
    } else if (fragranceId) {
      rateFragrance(fragranceId, rating)
    }
  }

  // Tapping the current rating clears it
  const onStarPress = (star: number) => setRating(currentRating === star ? null : star)

  // Screen readers adjust the whole star row with swipe up/down instead of
  // finding five unlabeled buttons
  const onRatingAccessibilityAction = (event: AccessibilityActionEvent) => {
    const current = currentRating ?? 0
    if (event.nativeEvent.actionName === "increment") setRating(Math.min(current + 1, 5))
    if (event.nativeEvent.actionName === "decrement") setRating(current > 1 ? current - 1 : null)
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
    <View className={`flex-1 ${modalColors.background}`}>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel={t("share.action")}
        hitSlop={8}
        className='absolute right-4 top-3 z-10 h-9 w-9 items-center justify-center'
        testID='fragrance-detail-share'
        onPress={() => setShareVisible(true)}>
        <MaterialCommunityIcons name='share-variant' size={22} color={getColor(mutedColors)} />
      </TouchableOpacity>
      <ScrollView
        className='flex-1'
        contentContainerClassName='px-5 pt-6 pb-12'
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'>
        <View className='items-center justify-center' style={{ minHeight: 224 }}>
          <HeroGlow />
          {imageUrl ? (
            // White backing keeps product shots (white backgrounds) from clashing in dark mode
            <View className='h-56 w-56 items-center justify-center bg-white rounded-3xl' style={heroShadow}>
              <Image
                style={{ height: 184, width: 184 }}
                contentFit='contain'
                transition={150}
                source={{ uri: imageUrl }}
              />
            </View>
          ) : (
            <View
              className={`h-56 w-56 items-center justify-center rounded-3xl border ${baseBorderClass} ${modalColors.background}`}
              style={heroShadow}>
              <MaterialCommunityIcons name='image-off' size={44} color={getColor(mutedColors)} />
            </View>
          )}
        </View>

        <Card.Title centered>{title}</Card.Title>
        <Card.Subtitle centered>{brand}</Card.Subtitle>

        {collectionItem ? (
          <StatTile
            className='mt-5'
            items={[
              { value: timesWorn, label: t("detail.timesWorn") },
              {
                value: lastWorn
                  ? formatRelativeDay(lastWorn).replace(/^./, (c) => c.toUpperCase())
                  : t("detail.never"),
                label: t("detail.lastWorn"),
              },
              ...(community?.avg != null && community.count
                ? [
                    {
                      value: `★ ${community.avg.toFixed(1)}`,
                      label: t("detail.ratingCount", { count: community.count }),
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <Card.WearInfoText
            timesWorn={timesWorn}
            lastWorn={lastWorn}
            centered
            avgRating={community?.avg}
            ratingCount={community?.count}
          />
        )}

        {!collectionItem && fragranceId && (
          <View className='flex-row pt-5' style={{ gap: 10 }}>
            <View className='flex-1'>
              <Button
                fullWidth
                label={ownedCatalogRow ? t("wishlist.inCollection") : t("wishlist.addToCollection")}
                disabled={ownedCatalogRow}
                loading={adding}
                onPress={addToCollection}
                testID='detail-add-button'
              />
            </View>
            {!ownedCatalogRow && (
              <View className='flex-1'>
                <Button
                  fullWidth
                  variant='secondary'
                  tone={onWishlist ? "accent" : "base"}
                  label={onWishlist ? t("wishlist.onWishlist") : t("wishlist.wantToTry")}
                  onPress={toggleWishlist}
                  testID='detail-wishlist-button'
                />
              </View>
            )}
          </View>
        )}

        {collectionItem && (
          <>
            <View
              className='items-center pt-5'
              accessible
              accessibilityRole='adjustable'
              accessibilityLabel={t("detail.yourRating")}
              accessibilityValue={{
                min: 0,
                max: 5,
                now: currentRating ?? 0,
                text: currentRating ? t("detail.ratingValue", { count: currentRating }) : t("detail.notRated"),
              }}
              // "activate" is declared and ignored: otherwise a double-tap is
              // replayed as a touch on the middle star, rating it 3
              accessibilityActions={[
                { name: "increment" },
                { name: "decrement" },
                { name: "activate" },
              ]}
              onAccessibilityAction={onRatingAccessibilityAction}>
              {/* Android would still focus each star inside an accessible parent */}
              <View
                className='flex-row'
                style={{ gap: 6 }}
                importantForAccessibility='no-hide-descendants'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <PressableScale key={star} onPress={() => onStarPress(star)} hitSlop={6}>
                    <MaterialCommunityIcons
                      name={(currentRating ?? 0) >= star ? "star" : "star-outline"}
                      size={30}
                      color={
                        (currentRating ?? 0) >= star
                          ? getColor("amber-400")
                          : getColor(mutedColors)
                      }
                    />
                  </PressableScale>
                ))}
              </View>
            </View>

            <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>{t("detail.bottle")}</Text>
            <SegmentedControl
              options={BOTTLE_TYPES.map((type) => ({
                value: type,
                label: t(`detail.bottleTypes.${type}`),
                testID: `detail-bottle-${type}`,
              }))}
              value={bottleType}
              onChange={changeBottleType}
            />
            <View className='flex-row items-center justify-between pt-3'>
              <Text className={`${baseTextClass} text-sm`}>{t("detail.runningLow")}</Text>
              <Switch
                value={runningLow}
                onValueChange={changeRunningLow}
                accessibilityLabel={t("detail.runningLow")}
                trackColor={{ true: getColor(theme === "dark" ? "amber-500" : "amber-600") }}
              />
            </View>

            <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>{t("detail.tags")}</Text>
            <TagInput
              tags={collectionItem.tags}
              onChange={(tags) => updateFragrance({ id: collectionItem.id }, { tags })}
            />

            <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>{t("detail.notes")}</Text>
            <TextField
              value={notes}
              onChangeText={setNotes}
              onEndEditing={saveNotes}
              onBlur={saveNotes}
              multiline
              maxLength={2000}
              minHeightClass='min-h-[96px]'
              placeholder={t("detail.notesPlaceholder")}
            />
            <Text className={`${mutedTextClass} text-xs pt-1 text-right`}>
              {t("detail.savedAutomatically")}
            </Text>
          </>
        )}

        {fragranceId && user && <FragranceVoting userId={user.id} fragranceId={fragranceId} />}

        {/* Only catalog-linked rows have a fragranceId to report against — a
            manual add has nothing in the shared catalog to flag */}
        {fragranceId && (
          <TouchableOpacity
            className='flex-row items-center justify-center pt-8'
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t("detail.reportListing")}
            onPress={() =>
              router.push({
                pathname: "/report-fragrance",
                params: {
                  fragranceId,
                  name,
                  ...(imageUrl ? { imageUrl } : {}),
                },
              })
            }>
            <MaterialCommunityIcons name='flag-outline' size={15} color={getColor(mutedColors)} />
            <Text className={`${mutedTextClass} text-xs pl-1.5`}>{t("detail.reportListing")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ShareSheetModal
        visible={shareVisible}
        title={t("share.sheetTitleFragrance")}
        message={shareMessage}
        toggles={shareToggles}
        onClose={() => setShareVisible(false)}
      />
    </View>
  )
}

const heroShadow = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
}).shadow

export default FragranceDetailScreen
