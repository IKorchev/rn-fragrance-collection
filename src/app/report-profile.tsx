import React, { useState } from "react"
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import { reportError } from "@/lib/sentry"
import { PROFILE_REPORT_REASONS, isTooManyReportsError, type ProfileReportReason } from "@/lib/queries"
import TextField from "@/components/shared/ui/text-field"
import Button from "@/components/shared/ui/button"

// Report another collector's public profile (user-profile.tsx's overflow
// menu) — App Review 1.2. Same reason-picker shape as report-fragrance.tsx;
// moderators act on it from moderation.tsx's Profiles tab.
const ReportProfileScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams<{ userId: string; name: string; avatarUrl?: string }>()
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
  const { reportProfile } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const [reason, setReason] = useState<ProfileReportReason | null>(null)
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await reportProfile({
        reportedUserId: params.userId,
        reason,
        details: details.trim() || undefined,
      })
      router.back()
      showToast({ message: t("reportProfile.thanks") })
    } catch (error) {
      if (isTooManyReportsError(error)) {
        Alert.alert(t("reportProfile.tooManyTitle"), t("reportProfile.tooManyMessage"))
        return
      }
      reportError(error, { flow: "report-profile" })
      Alert.alert(t("reportProfile.failedTitle"), t("reportProfile.failedMessage"))
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
      <Text className={`${baseTextClass} text-xl font-bold text-center`}>{t("reportProfile.title")}</Text>
      <Text className={`${mutedTextClass} text-sm text-center pt-1`}>{t("reportProfile.subtitle")}</Text>

      <View
        className={`flex-row items-center mt-5 p-2 rounded-xl ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
        <Avatar
          rounded
          size={40}
          source={params.avatarUrl ? { uri: params.avatarUrl } : undefined}
          icon={<MaterialCommunityIcons name='account' size={24} color={getColor("zinc-500")} />}
          containerStyle={{ backgroundColor: getColor(theme === "dark" ? "zinc-700" : "zinc-200") }}
        />
        <Text className={`${baseTextClass} text-sm font-semibold flex-1 pl-3`} numberOfLines={1}>
          {params.name}
        </Text>
      </View>

      <Text className={`${baseTextClass} text-sm font-semibold pt-6 pb-2`}>
        {t("reportProfile.reasonHeading")}
      </Text>
      <View accessibilityRole='radiogroup'>
        {PROFILE_REPORT_REASONS.map((option) => {
          const selected = reason === option.key
          const label = t(option.labelKey)
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => setReason(option.key)}
              accessibilityRole='radio'
              accessibilityState={{ selected }}
              accessibilityLabel={label}
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
                {label}
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
        placeholder={t("reportProfile.detailsPlaceholder")}
        multiline
        maxLength={1000}
        minHeightClass='min-h-[80px]'
      />

      <Button
        label={t("reportProfile.submit")}
        onPress={handleSubmit}
        disabled={!reason}
        loading={submitting}
        loadingLabel={t("reportProfile.submitting")}
        className='mt-6'
        testID='submit-profile-report'
      />
    </ScrollView>
  )
}

export default ReportProfileScreen
