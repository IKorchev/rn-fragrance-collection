import React, { useMemo, useState } from "react"
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Directory, File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { reportError } from "@/lib/sentry"
import { supabase } from "@/lib/supabase"
import { useMyRatings, useWearHistoryExport, useWishlist, type WearEvent, type WishlistItem } from "@/lib/queries"
import { withMyRatings } from "@/lib/utils/use-rated-collection"
import type { Tables } from "@/lib/database.types"
import type { UserFragrance } from "@/contexts/auth-context"
import Button from "@/components/shared/ui/button"
import FilterChip from "@/components/shared/ui/filter-chip"

type ExportFormat = "csv" | "json"

type VoteExportRow = Pick<
  Tables<"fragrance_votes">,
  "fragrance_id" | "seasons" | "gender" | "sillage" | "longevity"
>

const MIME_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv",
  json: "application/json",
}

// iOS shareAsync wants a Uniform Type Identifier, not a MIME type — both are
// real, registered system UTIs (conform to public.text/public.data).
const UTIS: Record<ExportFormat, string> = {
  csv: "public.comma-separated-values-text",
  json: "public.json",
}

// Own subdirectory under the OS-reclaimable cache dir, so cleanup (below)
// only ever touches files this screen created — never anything else the app
// or its libraries cache there.
const exportsDir = new Directory(Paths.cache, "data-exports")

// Best-effort: clears out any file left over from a previous export before
// writing the new one. Deliberately NOT called right after sharing the file
// that was just created — on Android, Sharing.shareAsync's promise resolves
// once the share intent is launched, not once the receiving app has finished
// reading the file, so deleting immediately after can race a slow consumer
// (e.g. Gmail attaching it). Running this before the *next* export instead
// means the just-shared file always outlives its share, and stale files
// still get reclaimed (worst case, by the OS itself — Paths.cache exists
// precisely for this).
const clearPreviousExport = () => {
  try {
    if (exportsDir.exists) exportsDir.delete()
  } catch (error) {
    reportError(error, { flow: "export-data-cleanup" })
  }
}

const csvCell = (value: string | number | null | undefined): string => {
  const s = value == null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const csvSection = (title: string, header: string[], rows: (string | number | null)[][]) =>
  [title, header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n")

// NOTE: deliberately omits bottle_price / bottle_size_ml — this app doesn't
// surface bottle cost or value anywhere, and export shouldn't be the one
// place that does.
const buildCsv = (
  collection: UserFragrance[],
  wearEvents: WearEvent[],
  votes: VoteExportRow[],
  wishlist: WishlistItem[]
) => {
  const collectionRows = collection.map((f) => {
    const brand = f.name.split(" - ")[0]
    const title = f.name.split(" - ").slice(1).join(" - ")
    return [
      brand,
      title,
      f.times_worn,
      f.last_worn,
      f.rating,
      f.notes,
      f.bottle_type,
      f.running_low ? "Yes" : "No",
      f.created_at,
      f.fragrance_id ? "Yes" : "No",
    ]
  })
  const wearRows = wearEvents.map((e) => [e.name, e.worn_at])

  return (
    csvSection(
      "My Collection",
      [
        "Brand",
        "Title",
        "Times Worn",
        "Last Worn",
        "My Rating",
        "My Notes",
        "Bottle",
        "Running Low",
        "Added On",
        "Catalog Linked",
      ],
      collectionRows
    ) +
    "\n\n" +
    csvSection("Scent Diary", ["Fragrance", "Worn At"], wearRows) +
    "\n\n" +
    csvSection(
      "Wishlist",
      ["Fragrance", "Added On"],
      wishlist.map((item) => [item.name, item.created_at])
    ) +
    "\n\n" +
    csvSection(
      "My Fragrance Votes",
      ["Fragrance ID", "Seasons", "Gender", "Sillage", "Longevity"],
      votes.map((vote) => [
        vote.fragrance_id,
        vote.seasons.join("; "),
        vote.gender,
        vote.sillage,
        vote.longevity,
      ])
    ) +
    "\n"
  )
}

const buildJson = (
  collection: UserFragrance[],
  wearEvents: WearEvent[],
  votes: VoteExportRow[],
  wishlist: WishlistItem[]
) =>
  JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      collection: collection.map((f) => ({
        brand: f.name.split(" - ")[0],
        title: f.name.split(" - ").slice(1).join(" - "),
        times_worn: f.times_worn,
        last_worn: f.last_worn,
        my_rating: f.rating,
        my_notes: f.notes,
        bottle: f.bottle_type,
        running_low: f.running_low,
        added_on: f.created_at,
        catalog_linked: !!f.fragrance_id,
      })),
      wear_history: wearEvents.map((e) => ({ fragrance: e.name, worn_at: e.worn_at })),
      wishlist: wishlist.map((item) => ({ fragrance: item.name, added_on: item.created_at })),
      votes,
    },
    null,
    2
  )

// Personal-data export (Profile tab entry point). Reads only come from
// AuthContext.userCollection (already own-rows via RLS) and
// useWearHistoryExport (same RLS), so there's no path to another user's
// data. Writes a real temporary .csv/.json file (expo-file-system) into the
// cache dir and hands it to the OS share sheet (expo-sharing) with the
// matching MIME type/UTI — the file never leaves the device except through
// whatever the user picks in that sheet (Files, Mail, a messaging app, etc);
// nothing is uploaded by this screen.
const ExportDataScreen = () => {
  const { modalColors, baseTextClass, mutedTextClass, baseBorderClass, accentColors, mutedColors } = useTheme()
  const { user, userCollection } = useAuth()
  const { t } = useLocale()
  const {
    data: wearEvents,
    isPending: wearPending,
    isError: wearError,
    fetchStatus: wearFetchStatus,
    refetch: refetchWearEvents,
  } = useWearHistoryExport(user?.id)
  const {
    data: votes,
    isPending: votesPending,
    isError: votesError,
    fetchStatus: votesFetchStatus,
    refetch: refetchVotes,
  } = useQuery({
    queryKey: ["fragrance-votes-export", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fragrance_votes")
        .select("fragrance_id,seasons,gender,sillage,longevity")
        .eq("user_id", user!.id)

      if (error) {
        reportError(error, { flow: "export-votes" })
        throw error
      }
      return data ?? []
    },
  })
  const {
    data: myRatings,
    isPending: ratingsPending,
    isError: ratingsError,
    fetchStatus: ratingsFetchStatus,
    refetch: refetchRatings,
  } = useMyRatings(user?.id)
  const {
    data: wishlist,
    isPending: wishlistPending,
    isError: wishlistError,
    fetchStatus: wishlistFetchStatus,
    refetch: refetchWishlist,
  } = useWishlist(user?.id)
  // Catalog-linked bottles keep their rating in fragrance_ratings, not on the
  // collection row — without this their "My Rating" column would be empty
  const ratedCollection = useMemo(
    () => withMyRatings(userCollection, myRatings),
    [userCollection, myRatings]
  )
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [sharing, setSharing] = useState(false)

  // react-query pauses queries while offline (see src/lib/query-client.ts) —
  // fetchStatus stays "paused" instead of settling into error, so this is
  // distinguishable from a real fetch failure.
  const loading = wearPending || votesPending || ratingsPending || wishlistPending
  const error = wearError || votesError || ratingsError || wishlistError
  const offline =
    (wearPending && wearFetchStatus === "paused") ||
    (votesPending && votesFetchStatus === "paused") ||
    (ratingsPending && ratingsFetchStatus === "paused") ||
    (wishlistPending && wishlistFetchStatus === "paused")
  const ready =
    !loading &&
    !error &&
    wearEvents !== undefined &&
    votes !== undefined &&
    myRatings !== undefined &&
    wishlist !== undefined
  const isEmpty =
    ready && userCollection.length === 0 && wearEvents.length === 0 && votes.length === 0 && wishlist.length === 0

  const handleExport = async () => {
    if (!ready) return
    setSharing(true)
    try {
      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        Alert.alert(
          t("export.sharingUnavailableTitle"),
          t("export.sharingUnavailableMessage")
        )
        return
      }

      const content =
        format === "csv"
          ? buildCsv(ratedCollection, wearEvents, votes, wishlist)
          : buildJson(ratedCollection, wearEvents, votes, wishlist)
      const dateStamp = new Date().toISOString().slice(0, 10)
      const filename = `fragrance-collection-export-${dateStamp}.${format}`

      clearPreviousExport()
      exportsDir.create({ idempotent: true })
      const file = new File(exportsDir, filename)
      file.create({ overwrite: true })
      file.write(content)

      await Sharing.shareAsync(file.uri, {
        mimeType: MIME_TYPES[format],
        UTI: UTIS[format],
        dialogTitle: t("export.dialogTitle"),
      })
    } catch (error) {
      reportError(error, { flow: "export-data" })
      Alert.alert(t("export.failedTitle"), t("export.failedMessage"))
    } finally {
      setSharing(false)
    }
  }

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-6 pb-12'
      showsVerticalScrollIndicator={false}>
      <Text className={`${baseTextClass} text-xl font-bold text-center`}>{t("export.title")}</Text>
      <Text className={`${mutedTextClass} text-sm text-center pt-2`}>
        {t("export.description")}
      </Text>

      <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>{t("export.format")}</Text>
      <View className='flex-row' style={{ gap: 8 }}>
        <FilterChip label={t("export.csv")} selected={format === "csv"} onPress={() => setFormat("csv")} />
        <FilterChip label='JSON' selected={format === "json"} onPress={() => setFormat("json")} />
      </View>

      <View className={`rounded-2xl border ${baseBorderClass} p-4 mt-6`}>
        {offline ? (
          <View className='items-center py-4'>
            <MaterialCommunityIcons name='wifi-off' size={28} color={getColor(mutedColors)} />
            <Text className={`${baseTextClass} text-sm font-semibold text-center pt-3`}>{t("export.offlineTitle")}</Text>
            <Text className={`${mutedTextClass} text-xs text-center pt-1`}>
              {t("export.offlineMessage")}
            </Text>
          </View>
        ) : loading ? (
          <View className='items-center py-4'>
            <ActivityIndicator color={getColor(accentColors)} />
            <Text className={`${mutedTextClass} text-xs pt-3`}>{t("export.preparing")}</Text>
          </View>
        ) : error ? (
          <View className='items-center py-4'>
            <MaterialCommunityIcons name='cloud-alert' size={28} color={getColor(mutedColors)} />
            <Text className={`${baseTextClass} text-sm font-semibold text-center pt-3`}>
              {t("export.loadError")}
            </Text>
            <Button
              variant='secondary'
              fullWidth={false}
              label={t("collection.tryAgain")}
              onPress={() => Promise.all([refetchWearEvents(), refetchVotes(), refetchRatings(), refetchWishlist()])}
              className='mt-3 px-6'
            />
          </View>
        ) : (
          <>
            <Text className={`${mutedTextClass} text-sm`}>
              {t("export.collectionCount", { count: userCollection.length })}
            </Text>
            <Text className={`${mutedTextClass} text-sm pt-1`}>
              {t("export.entriesCount", { count: wearEvents.length })}
            </Text>
            <Text className={`${mutedTextClass} text-sm pt-1`}>
              {t("export.votesCount", { count: votes.length })}
            </Text>
            <Text className={`${mutedTextClass} text-sm pt-1`}>
              {t("export.wishlistCount", { count: wishlist.length })}
            </Text>
            {isEmpty && (
              <Text className={`${mutedTextClass} text-xs pt-2`}>
                {t("export.empty")}
              </Text>
            )}
          </>
        )}
      </View>

      <Button
        label={t("export.action")}
        onPress={handleExport}
        disabled={!ready}
        loading={sharing}
        loadingLabel={t("export.preparingShort")}
        className='mt-6'
        testID='export-data-submit'
      />
    </ScrollView>
  )
}

export default ExportDataScreen
