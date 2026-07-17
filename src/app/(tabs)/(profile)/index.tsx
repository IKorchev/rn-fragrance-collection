import React, { useMemo, useState } from "react"
import { ScrollView, View, Text, TouchableOpacity, Switch, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import { supabase } from "@/lib/supabase"
import { useIsModerator, useRemindersEnabled, useWearHistory } from "@/lib/queries"
import { purchasesEnabled, presentPaywall, PAYWALL_RESULT } from "@/lib/purchases"
import { isWornToday } from "@/lib/utils/worn-today"
import { buildRecapShareText, buildTodaysScentShareText } from "@/lib/share"
import useTheme from "@/contexts/theme-context"
import useToast from "@/contexts/toast-context"
import useAuth from "@/contexts/auth-context"
import useLocale, { type LocalePreference } from "@/contexts/locale-context"
import Badge from "@/components/shared/ui/badge"
import Row from "@/components/shared/ui/row"
import StatTile from "@/components/shared/ui/stat-tile"
import Button from "@/components/shared/ui/button"
import Dialog from "@/components/shared/ui/dialog"
import ShareSheetModal from "@/components/share-sheet-modal"

const ProfileScreen = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { modalColors, baseTextClass, mutedTextClass, mutedColors, accentColors, theme, danger } =
    useTheme()
  const { user, logOut, deleteAccount, userCollection, isPro } = useAuth()
  const { showToast } = useToast()
  const { t, formatDate, localePreference, setLocalePreference, supportedLocales } = useLocale()
  const { data: remindersEnabled } = useRemindersEnabled(user?.id)
  const { data: isModerator } = useIsModerator(user?.id)
  const { data: events } = useWearHistory(user?.id)
  const [deleting, setDeleting] = useState(false)
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false)
  const [recapShareVisible, setRecapShareVisible] = useState(false)
  const [todayShareVisible, setTodayShareVisible] = useState(false)

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? t("profile.anonymous")
  const totalWears = userCollection.reduce((sum, el) => sum + el.times_worn, 0)
  const memberSince = user?.created_at
    ? formatDate(new Date(user.created_at), { month: "long", year: "numeric" })
    : null

  // Wears this calendar month + current daily streak, from the personal wear
  // diary (same day semantics as the once-per-day wear cap: device-local days)
  const { monthWears, streak } = useMemo(() => {
    const now = new Date()
    const wornDays = new Set<string>()
    let monthWears = 0
    for (const event of events ?? []) {
      const date = new Date(event.worn_at)
      wornDays.add(date.toDateString())
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        monthWears++
      }
    }
    // A streak survives until a full day is missed — start counting from
    // today if worn, else from yesterday
    let streak = 0
    const cursor = new Date()
    if (!wornDays.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
    while (wornDays.has(cursor.toDateString())) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return { monthWears, streak }
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
              console.log(error)
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

      <StatTile
        className='mt-8'
        items={[
          { value: userCollection.length, label: t("profile.stats.inCollection") },
          { value: totalWears, label: t("profile.stats.totalWears") },
        ]}
      />

      <StatTile
        className='mt-4'
        items={[
          { value: monthWears, label: t("profile.stats.thisMonth") },
          { value: streak, label: t("profile.stats.dayStreak", { count: streak }) },
        ]}
      />

      {mostWorn && (
        <Text className={`${mutedTextClass} text-sm pt-3`}>
          {t("profile.mostWornLabel")}{" "}
          <Text className={`${baseTextClass} font-semibold`}>
            {mostWorn.name.split(" - ").slice(1).join(" - ")}
          </Text>{" "}
          {t("profile.mostWornCount", { count: mostWorn.times_worn })}
        </Text>
      )}

      {purchasesEnabled && (!isPro || __DEV__) && (
        <Row
          icon='star-four-points'
          tone='accent'
          className='mt-6'
          label={isPro ? t("profile.viewPaywallDev") : t("profile.upgradeToPro")}
          onPress={handleUpgrade}
        />
      )}

      <Row
        icon='history'
        className='mt-4'
        label={t("profile.wearHistoryRow")}
        onPress={() => router.push("/wear-history")}
      />

      {isModerator && (
        <Row
          icon='shield-check-outline'
          className='mt-4'
          label={t("profile.moderationQueue")}
          onPress={() => router.push("/moderation")}
        />
      )}

      <Row
        icon='bell-outline'
        className='mt-4'
        label={t("profile.dailyReminder")}
        trailing={
          <Switch
            value={remindersEnabled ?? true}
            onValueChange={toggleReminders}
            trackColor={{ true: getColor(theme === "dark" ? "emerald-500" : "emerald-600") }}
          />
        }
      />

      <Row
        icon='translate'
        className='mt-4'
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
        icon='chart-timeline-variant'
        className='mt-4'
        label={t("profile.shareRecap")}
        testID='profile-share-recap-row'
        onPress={() => setRecapShareVisible(true)}
      />

      {todayFragrance && (
        <Row
          icon='flower-tulip-outline'
          className='mt-4'
          label={t("profile.shareToday")}
          testID='profile-share-today-row'
          onPress={() => setTodayShareVisible(true)}
        />
      )}

      <Row
        icon='shield-lock-outline'
        className='mt-4'
        label={t("screens.privacyPolicy")}
        onPress={() => router.push("/privacy-policy")}
      />

      <Row
        icon='file-document-outline'
        className='mt-4'
        label={t("screens.terms")}
        onPress={() => router.push("/terms")}
      />

      <TouchableOpacity
        onPress={logOut}
        className={`${danger.bgClass} flex-row items-center justify-center w-full mt-8 py-3 rounded-2xl`}>
        <MaterialCommunityIcons name='logout' size={20} color={getColor(danger.color)} />
        <Text className={`${danger.textClass} text-base font-semibold pl-2`}>{t("profile.signOut")}</Text>
      </TouchableOpacity>

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
