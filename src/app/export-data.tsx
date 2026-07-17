import React, { useState } from "react"
import { ActivityIndicator, Alert, ScrollView, Share, Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import { useWearHistoryExport, type WearEvent } from "@/lib/queries"
import type { UserFragrance } from "@/contexts/auth-context"
import Button from "@/components/shared/ui/button"
import FilterChip from "@/components/shared/ui/filter-chip"

type ExportFormat = "csv" | "json"

const csvCell = (value: string | number | null | undefined): string => {
  const s = value == null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const csvSection = (title: string, header: string[], rows: (string | number | null)[][]) =>
  [title, header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n")

// NOTE: deliberately omits bottle_price / bottle_size_ml — this app doesn't
// surface bottle cost or value anywhere, and export shouldn't be the one
// place that does.
const buildCsv = (collection: UserFragrance[], wearEvents: WearEvent[]) => {
  const collectionRows = collection.map((f) => {
    const brand = f.name.split(" - ")[0]
    const title = f.name.split(" - ").slice(1).join(" - ")
    return [brand, title, f.times_worn, f.last_worn, f.rating, f.notes, f.created_at, f.fragrance_id ? "Yes" : "No"]
  })
  const wearRows = wearEvents.map((e) => [e.name, e.worn_at])

  return (
    csvSection(
      "My Fragrance Collection",
      ["Brand", "Title", "Times Worn", "Last Worn", "My Rating", "My Notes", "Added On", "Catalog Linked"],
      collectionRows
    ) +
    "\n\n" +
    csvSection("Wear History", ["Fragrance", "Worn At"], wearRows) +
    "\n"
  )
}

const buildJson = (collection: UserFragrance[], wearEvents: WearEvent[]) =>
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
        added_on: f.created_at,
        catalog_linked: !!f.fragrance_id,
      })),
      wear_history: wearEvents.map((e) => ({ fragrance: e.name, worn_at: e.worn_at })),
    },
    null,
    2
  )

// Personal-data export (Profile tab entry point). Reads only come from
// AuthContext.userCollection (already own-rows via RLS) and
// useWearHistoryExport (same RLS), so there's no path to another user's
// data. Uses RN's built-in Share sheet — no new native module, no upload:
// the file never leaves the device except through whatever the user picks
// in the share sheet (Files, Mail, a messaging app, etc).
const ExportDataScreen = () => {
  const { modalColors, baseTextClass, mutedTextClass, baseBorderClass, accentColors, mutedColors } = useTheme()
  const { user, userCollection } = useAuth()
  const { data: wearEvents, isPending, isError, fetchStatus, refetch } = useWearHistoryExport(user?.id)
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [sharing, setSharing] = useState(false)

  // react-query pauses queries while offline (see src/lib/query-client.ts) —
  // fetchStatus stays "paused" instead of settling into error, so this is
  // distinguishable from a real fetch failure.
  const offline = fetchStatus === "paused" && isPending
  const ready = !isPending && !isError && wearEvents !== undefined
  const isEmpty = ready && userCollection.length === 0 && wearEvents.length === 0

  const handleExport = async () => {
    if (!ready) return
    setSharing(true)
    try {
      const content = format === "csv" ? buildCsv(userCollection, wearEvents) : buildJson(userCollection, wearEvents)
      const dateStamp = new Date().toISOString().slice(0, 10)
      await Share.share(
        { title: `fragrance-collection-export-${dateStamp}.${format}`, message: content },
        { dialogTitle: "Export your fragrance data" }
      )
    } catch (error) {
      console.log(error)
      Alert.alert("Export failed", "Something went wrong, please try again.")
    } finally {
      setSharing(false)
    }
  }

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-6 pb-12'
      showsVerticalScrollIndicator={false}>
      <Text className={`${baseTextClass} text-xl font-bold text-center`}>Export your data</Text>
      <Text className={`${mutedTextClass} text-sm text-center pt-2`}>
        Exports your collection (brand, name, times worn, last worn, your rating and notes) and your
        wear history (most recent 2,000 wears) as a file you control. Nothing is uploaded — you choose
        where it goes from the share sheet. Only your own data is included.
      </Text>

      <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>Format</Text>
      <View className='flex-row' style={{ gap: 8 }}>
        <FilterChip label='CSV (spreadsheet)' selected={format === "csv"} onPress={() => setFormat("csv")} />
        <FilterChip label='JSON' selected={format === "json"} onPress={() => setFormat("json")} />
      </View>

      <View className={`rounded-2xl border ${baseBorderClass} p-4 mt-6`}>
        {offline ? (
          <View className='items-center py-4'>
            <MaterialCommunityIcons name='wifi-off' size={28} color={getColor(mutedColors)} />
            <Text className={`${baseTextClass} text-sm font-semibold text-center pt-3`}>You're offline</Text>
            <Text className={`${mutedTextClass} text-xs text-center pt-1`}>
              Connect to the internet to export your wear history — this will retry automatically.
            </Text>
          </View>
        ) : isPending ? (
          <View className='items-center py-4'>
            <ActivityIndicator color={getColor(accentColors)} />
            <Text className={`${mutedTextClass} text-xs pt-3`}>Preparing your data…</Text>
          </View>
        ) : isError ? (
          <View className='items-center py-4'>
            <MaterialCommunityIcons name='cloud-alert' size={28} color={getColor(mutedColors)} />
            <Text className={`${baseTextClass} text-sm font-semibold text-center pt-3`}>
              Couldn't load your wear history
            </Text>
            <Button
              variant='secondary'
              fullWidth={false}
              label='Try again'
              onPress={() => refetch()}
              className='mt-3 px-6'
            />
          </View>
        ) : (
          <>
            <Text className={`${mutedTextClass} text-sm`}>
              {userCollection.length} fragrance{userCollection.length === 1 ? "" : "s"} in your collection
            </Text>
            <Text className={`${mutedTextClass} text-sm pt-1`}>
              {wearEvents.length} wear{wearEvents.length === 1 ? "" : "s"} logged
            </Text>
            {isEmpty && (
              <Text className={`${mutedTextClass} text-xs pt-2`}>
                Nothing to export yet — this will produce an empty file.
              </Text>
            )}
          </>
        )}
      </View>

      <Button
        label='Export'
        onPress={handleExport}
        disabled={!ready}
        loading={sharing}
        loadingLabel='Preparing…'
        className='mt-6'
        testID='export-data-submit'
      />
    </ScrollView>
  )
}

export default ExportDataScreen
