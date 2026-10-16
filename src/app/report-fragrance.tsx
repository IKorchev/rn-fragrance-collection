import React, { useState } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
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
  const { t } = useLocale()
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
      showToast({ message: t("reportFragrance.thanks") })
    } catch (error) {
      reportError(error, { flow: "report-fragrance" })
      Alert.alert(t("reportFragrance.failedTitle"), t("reportFragrance.failedMessage"))
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
      <Text className={`${baseTextClass} text-xl font-bold text-center`}>{t("reportFragrance.title")}</Text>
      <Text className={`${mutedTextClass} text-sm text-center pt-1`}>
        {t("reportFragrance.subtitle")}
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
              accessibilityLabel={t(option.labelKey)}
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
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>
        {t("reportProfile.detailsHeading")} <Text className={mutedTextClass}>{t("reportProfile.optional")}</Text>
      </Text>
      <TextField
        value={details}
        onChangeText={setDetails}
        placeholder={t("reportFragrance.detailsPlaceholder")}
        multiline
        maxLength={1000}
        minHeightClass='min-h-[80px]'
      />

      <Button
        label={t("reportFragrance.submit")}
        onPress={handleSubmit}
        disabled={!reason}
        loading={submitting}
        loadingLabel={t("reportFragrance.sending")}
        className='mt-6'
        testID='submit-report'
      />
    </ScrollView>
  )
}

export default ReportFragranceScreen
