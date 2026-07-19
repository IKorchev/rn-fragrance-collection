import React, { useMemo, useState } from "react"
import { ScrollView, View, Text, TouchableOpacity, Switch, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import { supabase } from "@/lib/supabase"
import { useIsModerator, useRemindersEnabled, useWearHistory } from "@/lib/queries"
import { useOnboarding } from "@/lib/utils/use-onboarding"
import { purchasesEnabled, presentPaywall, PAYWALL_RESULT } from "@/lib/purchases"
import { FREE_COLLECTION_LIMIT } from "@/lib/entitlements"
import { isWornToday } from "@/lib/utils/worn-today"
import { buildRecapShareText, buildTodaysScentShareText } from "@/lib/share"
import useTheme, { type ThemePreference } from "@/contexts/theme-context"
import useToast from "@/contexts/toast-context"
import useAuth from "@/contexts/auth-context"
import useLocale, { type LocalePreference } from "@/contexts/locale-context"
import { reportError } from "@/lib/sentry"
import useGamification from "@/lib/utils/use-gamification"
import { pickHighlightBadges } from "@/lib/utils/badge-highlights"
import Badge from "@/components/shared/ui/badge"
import Dialog from "@/components/shared/ui/dialog"
import Row from "@/components/shared/ui/row"
import RowGroup from "@/components/shared/ui/row-group"
import StatTile from "@/components/shared/ui/stat-tile"
import Button from "@/components/shared/ui/button"
import ShareSheetModal from "@/components/share-sheet-modal"
import WearHeatmap from "@/components/wear-heatmap"
import GamificationHeader from "@/components/gamification-header"
import BadgeTile from "@/components/badge-tile"

const APPEARANCE_OPTIONS: { key: ThemePreference; labelKey: string }[] = [
  { key: "system", labelKey: "profile.appearanceSystem" },
  { key: "light", labelKey: "profile.appearanceLight" },
  { key: "dark", labelKey: "profile.appearanceDark" },
]

const ProfileScreen = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    modalColors,
    baseTextClass,
    mutedTextClass,
    accentTextClass,
    accentColors,
    mutedColors,
    theme,
    themePreference,
    setThemePreference,
  } = useTheme()
  const { user, logOut, deleteAccount, userCollection, isPro } = useAuth()
  const { showToast } = useToast()
  const { t, formatDate, localePreference, setLocalePreference, supportedLocales } = useLocale()
  const { data: remindersEnabled } = useRemindersEnabled(user?.id)
  const { data: isModerator } = useIsModerator(user?.id)
  const { data: events } = useWearHistory(user?.id)
  const { allDone: onboardingDone, resume: resumeOnboarding } = useOnboarding()
  const [deleting, setDeleting] = useState(false)
  const [appearancePickerOpen, setAppearancePickerOpen] = useState(false)
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false)
  const [recapShareVisible, setRecapShareVisible] = useState(false)
  const [todayShareVisible, setTodayShareVisible] = useState(false)

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? t("profile.anonymous")
  const totalWears = userCollection.reduce((sum, el) => sum + el.times_worn, 0)
  const memberSince = user?.created_at
    ? formatDate(new Date(user.created_at), { month: "long", year: "numeric" })
    : null

  // Streak, XP, level, and badges all come from the shared gamification core
  // (src/lib/gamification) — this used to be computed inline here.
  const gamification = useGamification()
  const streak = gamification.streak
  const highlightBadges = useMemo(() => pickHighlightBadges(gamification.badges), [gamification.badges])

  // Wears this calendar month, from the personal wear diary (device-local
  // days — same semantics as the once-per-day wear cap)
  const monthWears = useMemo(() => {
    const now = new Date()
    let count = 0
    for (const event of events ?? []) {
      const date = new Date(event.worn_at)
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) count++
    }
    return count
  }, [events])

  const mostWorn = useMemo(() => {
    const top = [...userCollection].sort((a, b) => b.times_worn - a.times_worn)[0]
    return top && top.times_worn > 0 ? top : null
  }, [userCollection])

  // Whatever's most recently logged today — the "share today's scent" entry
  // point only appears once there's something to share (no dead-end row).
  const todayFragrance = useMemo(() => {
    const wornToday = userCollection.filter((el) => isWornToday(el.last_worn))
    if (!wornToday.length) return null
    return wornToday.reduce((latest, el) =>
      new Date(el.last_worn!) > new Date(latest.last_worn!) ? el : latest
    )
  }, [userCollection])

  const recapMessage = useMemo(
    () => buildRecapShareText(t, { monthWears, streak, collectionSize: userCollection.length }),
    [t, monthWears, streak, userCollection.length]
  )
  const todayMessage = useMemo(
    () => (todayFragrance ? buildTodaysScentShareText(t, { name: todayFragrance.name }) : ""),
    [t, todayFragrance]
  )

  const languageLabel = (pref: LocalePreference) =>
    pref === "system" ? t("language.system") : pref === "es" ? t("language.spanish") : t("language.english")

  // Presents the native paywall configured in the RevenueCat dashboard.
  // isPro flips reactively (see AuthContext's CustomerInfo listener) once a
  // purchase/restore lands, so this just handles the toast feedback.
  const handleUpgrade = async () => {
    const result = await presentPaywall()
    if (result === PAYWALL_RESULT.PURCHASED) {
      showToast({ message: t("profile.toastWelcomePro") })
    } else if (result === PAYWALL_RESULT.RESTORED) {
      showToast({ message: t("profile.toastPurchasesRestored") })
    }
  }

  // Optimistic — the switch flips immediately, reverts if the write fails
  const toggleReminders = async (value: boolean) => {
    queryClient.setQueryData(["reminder-prefs", user?.id], value)
    const { error } = await supabase
      .from("user_push_tokens")
      .update({ reminders_enabled: value })
      .eq("user_id", user!.id)
    if (error) {
      queryClient.setQueryData(["reminder-prefs", user?.id], !value)
      Alert.alert(t("profile.reminderUpdateFailedTitle"), t("profile.reminderUpdateFailedMessage"))
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.deleteConfirmTitle"),
      t("profile.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deleteConfirmConfirm"),
          style: "destructive",
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteAccount()
              // Auth state flips to signed-out and the Protected stack swaps
              // to the sign-in screen — nothing left to dismiss here.
            } catch (error) {
              reportError(error, { flow: "delete-account" })
              Alert.alert(t("profile.deleteFailedTitle"), t("profile.deleteFailedMessage"))
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-8 pb-12 items-center'
      showsVerticalScrollIndicator={false}>
      <Avatar
        size={96}
        rounded
        source={user?.photoURL ? { uri: user.photoURL } : undefined}
        icon={<MaterialCommunityIcons name='account' size={56} color={getColor("zinc-500")} />}
        containerStyle={{ backgroundColor: getColor(theme === "dark" ? "zinc-800" : "zinc-200") }}
      />

      <View className='flex-row items-center pt-4' style={{ gap: 6 }}>
        <Text className={`${baseTextClass} text-2xl font-bold`}>{displayName}</Text>
        {isPro && <Badge label='PRO' />}
      </View>
      {user?.email && <Text className={`${mutedTextClass} text-base pt-1`}>{user.email}</Text>}
      {memberSince && (
        <Text className={`${mutedTextClass} text-sm pt-1`}>
          {t("profile.memberSince", { date: memberSince })}
        </Text>
      )}

      <GamificationHeader state={gamification} className='mt-6' />

      <View className='w-full mt-4'>
        <View className='flex-row' style={{ gap: 10 }}>
          {highlightBadges.map((badge) => (
            <BadgeTile key={badge.id} badge={badge} size='sm' />
          ))}
        </View>
        <Row
          icon='trophy-outline'
          label={t("gamification.badgeWall.seeAllRow")}
          testID='profile-see-all-badges-row'
          className='mt-3'
          onPress={() => router.push("/badges")}
        />
      </View>

      {purchasesEnabled && (!isPro || __DEV__) && (
        <Row
          icon='star-four-points'
          tone='accent'
          className='mt-6 w-full'
          label={isPro ? t("profile.viewPaywallDev") : t("profile.upgradeToPro")}
          onPress={handleUpgrade}
        />
      )}

      <StatTile
        className='mt-6'
        columns={2}
        items={[
          { value: userCollection.length, label: t("profile.stats.inCollection") },
          { value: totalWears, label: t("profile.stats.totalWears") },
          { value: monthWears, label: t("profile.stats.thisMonth") },
          { value: streak, label: t("profile.stats.dayStreak", { count: streak }) },
        ]}
      />
      {!isPro && (
        <Text className={`${mutedTextClass} text-xs pt-2`}>
          {t("profile.freeCollectionLimit", { count: userCollection.length, limit: FREE_COLLECTION_LIMIT })}
        </Text>
      )}

      {mostWorn && (
        <Text className={`${mutedTextClass} text-sm pt-3`}>
          {t("profile.mostWornLabel")}{" "}
          <Text className={`${baseTextClass} font-semibold`}>
            {mostWorn.name.split(" - ").slice(1).join(" - ")}
          </Text>{" "}
          {t("profile.mostWornCount", { count: mostWorn.times_worn })}
        </Text>
      )}

      {!onboardingDone && (
        <Row
          icon='rocket-launch-outline'
          tone='accent'
          className='mt-6'
          label={t("profile.gettingStartedGuide")}
          onPress={() => {
            resumeOnboarding()
            router.navigate("/(tabs)/(collection)")
          }}
        />
      )}

      <WearHeatmap events={events ?? []} className='mt-6' />

      <RowGroup title={t("profile.sectionActivity")} className='mt-8'>
        <Row
          icon='history'
          label={t("profile.wearHistoryRow")}
          onPress={() => router.push("/wear-history")}
        />
        <Row
          icon='chart-timeline-variant'
          label={t("profile.shareRecap")}
          testID='profile-share-recap-row'
          onPress={() => setRecapShareVisible(true)}
        />
        {todayFragrance && (
          <Row
            icon='flower-tulip-outline'
            label={t("profile.shareToday")}
            testID='profile-share-today-row'
            onPress={() => setTodayShareVisible(true)}
          />
        )}
      </RowGroup>

      <RowGroup title={t("profile.sectionPreferences")} className='mt-6'>
        {/* Theme moved here from the header — appearance is a settings concern */}
        <Row
          icon='theme-light-dark'
          label={t("profile.appearance")}
          onPress={() => setAppearancePickerOpen(true)}
          trailing={
            <View className='flex-row items-center' style={{ gap: 4 }}>
              <Text className={`${mutedTextClass} text-base`}>
                {t(APPEARANCE_OPTIONS.find((o) => o.key === themePreference)!.labelKey)}
              </Text>
              <MaterialCommunityIcons name='chevron-right' size={20} color={getColor(mutedColors)} />
            </View>
          }
        />
        <Row
          icon='translate'
          label={t("profile.language")}
          testID='profile-language-row'
          onPress={() => setLanguagePickerVisible(true)}
          trailing={
            <View className='flex-row items-center' style={{ gap: 4 }}>
              <Text className={`${mutedTextClass} text-sm`}>{languageLabel(localePreference)}</Text>
              <MaterialCommunityIcons name='chevron-right' size={22} color={getColor(mutedColors)} />
            </View>
          }
        />
        <Row
          icon='bell-outline'
          label={t("profile.dailyReminder")}
          trailing={
            <Switch
              value={remindersEnabled ?? true}
              onValueChange={toggleReminders}
              trackColor={{ true: getColor(theme === "dark" ? "emerald-500" : "emerald-600") }}
            />
          }
        />
      </RowGroup>

      <RowGroup title={t("profile.sectionAccount")} className='mt-6'>
        <Row
          icon='export-variant'
          label={t("profile.exportData")}
          onPress={() => router.push("/export-data")}
        />
        {isModerator && (
          <Row
            icon='shield-check-outline'
            label={t("profile.moderationQueue")}
            onPress={() => router.push("/moderation")}
          />
        )}
        <Row
          icon='shield-lock-outline'
          label={t("screens.privacyPolicy")}
          onPress={() => router.push("/privacy-policy")}
        />
        <Row
          icon='file-document-outline'
          label={t("screens.terms")}
          onPress={() => router.push("/terms")}
        />
        <Row icon='logout' tone='danger' label={t("profile.signOut")} onPress={logOut} />
      </RowGroup>

      {/* App Store 5.1.1(v) / Play policy: account deletion must be in-app */}
      <Button
        variant='ghost'
        tone='danger'
        size='sm'
        className='mt-6'
        label={t("profile.deleteAccount")}
        loading={deleting}
        loadingLabel={t("profile.deletingAccount")}
        onPress={handleDeleteAccount}
      />

      <Dialog
        visible={appearancePickerOpen}
        title={t("profile.appearance")}
        onClose={() => setAppearancePickerOpen(false)}>
        {APPEARANCE_OPTIONS.map(({ key, labelKey }) => (
          <TouchableOpacity
            key={key}
            className='flex-row items-center justify-between py-3'
            onPress={() => {
              setThemePreference(key)
              setAppearancePickerOpen(false)
            }}>
            <Text className={key === themePreference ? `${accentTextClass} font-semibold` : baseTextClass}>
              {t(labelKey)}
            </Text>
            {key === themePreference && (
              <MaterialCommunityIcons name='check' size={18} color={getColor(accentColors)} />
            )}
          </TouchableOpacity>
        ))}
      </Dialog>

      <Dialog
        visible={languagePickerVisible}
        title={t("language.title")}
        onClose={() => setLanguagePickerVisible(false)}
        cancelLabel={t("common.close")}>
        {(["system", ...supportedLocales] as LocalePreference[]).map((pref) => {
          const selected = pref === localePreference
          return (
            <TouchableOpacity
              key={pref}
              accessibilityRole='button'
              accessibilityState={{ selected }}
              testID={`language-option-${pref}`}
              className='flex-row items-center justify-between py-3'
              onPress={() => {
                setLocalePreference(pref)
                setLanguagePickerVisible(false)
              }}>
              <Text className={`${baseTextClass} text-base`}>{languageLabel(pref)}</Text>
              {selected && <MaterialCommunityIcons name='check' size={20} color={getColor(accentColors)} />}
            </TouchableOpacity>
          )
        })}
      </Dialog>

      <ShareSheetModal
        visible={recapShareVisible}
        title={t("share.sheetTitleRecap")}
        message={recapMessage}
        onClose={() => setRecapShareVisible(false)}
      />

      {todayFragrance && (
        <ShareSheetModal
          visible={todayShareVisible}
          title={t("share.sheetTitleToday")}
          message={todayMessage}
          onClose={() => setTodayShareVisible(false)}
        />
      )}
    </ScrollView>
  )
}

export default ProfileScreen
