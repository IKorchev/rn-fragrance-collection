import React, { useState } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import { reportError } from "@/lib/sentry"
import { REPORT_REASONS, type ReportReason } from "@/lib/queries"
import Card from "@/components/card"
import TextField from "@/components/shared/ui/text-field"
import Button from "@/components/shared/ui/button"

// Catalog feedback on an EXISTING row (fragrance-detail.tsx's "Report an
// issue" link) — separate flow from manual-add's new-fragrance suggestion.
// Always opened with a fragranceId param (catalog-linked rows only; manual
// adds have no fragrance_id to report against).
const ReportFragranceScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams<{ fragranceId: string; name: string; imageUrl?: string }>()
  const {
    theme,
    modalColors,
    baseTextClass,
    mutedTextClass,
    mutedColors,
    accentColors,
    baseBorderClass,
    accentTintBg,
  } = useTheme()
  const { reportFragrance } = useAuth()
  const { showToast } = useToast()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const brand = params.name?.split(" - ")[0] ?? ""
  const title = params.name?.split(" - ").slice(1).join(" - ") ?? params.name ?? ""

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await reportFragrance({
        fragranceId: params.fragranceId,
        reason,
        details: details.trim() || undefined,
      })
      router.back()
      showToast({ message: "Thanks — we'll take a look." })
    } catch (error) {
      reportError(error, { flow: "report-fragrance" })
      Alert.alert("Couldn't send your report", "Something went wrong, please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-6 pb-12'
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'>
      <Text className={`${baseTextClass} text-xl font-bold text-center`}>Report an issue</Text>
      <Text className={`${mutedTextClass} text-sm text-center pt-1`}>
        Flag a problem with this catalog listing for our moderators.
      </Text>

      <View
        className={`flex-row items-center mt-5 p-2 rounded-xl ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
        <Card.Thumbnail imageUrl={params.imageUrl} compact />
        <View className='flex-1'>
          <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
            {title}
          </Text>
          <Text className={`${mutedTextClass} text-xs`} numberOfLines={1}>
            {brand}
          </Text>
        </View>
      </View>

      <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>What's wrong?</Text>
      <View accessibilityRole='radiogroup'>
        {REPORT_REASONS.map((option) => {
          const selected = reason === option.key
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => setReason(option.key)}
              accessibilityRole='radio'
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              className={`flex-row items-center mt-2 px-4 py-3 rounded-2xl border ${
                selected ? "" : baseBorderClass
              }`}
              style={selected ? { backgroundColor: accentTintBg, borderColor: getColor(accentColors) } : undefined}>
              <MaterialCommunityIcons
                name={selected ? "radiobox-marked" : "radiobox-blank"}
                size={20}
                color={selected ? getColor(accentColors) : getColor(mutedColors)}
              />
              <Text className={`${selected ? baseTextClass : mutedTextClass} text-sm font-semibold pl-3`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>
        Details <Text className={mutedTextClass}>(optional)</Text>
      </Text>
      <TextField
        value={details}
        onChangeText={setDetails}
        placeholder='Anything that helps us fix it…'
        multiline
        maxLength={1000}
        minHeightClass='min-h-[80px]'
      />

      <Button
        label='Submit report'
        onPress={handleSubmit}
        disabled={!reason}
        loading={submitting}
        loadingLabel='Sending…'
        className='mt-6'
        testID='submit-report'
      />
    </ScrollView>
  )
}

export default ReportFragranceScreen
