import React, { useState } from "react"
import { ScrollView, View, Text, Switch, Alert, Linking } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import { supabase } from "@/lib/supabase"
import {
  PROFILE_HIDDEN_ERROR_CODE,
  useBlockedUsers,
  useIsModerator,
  useMyProfile,
  useNotificationPermission,
  useRemindersEnabled,
  type UserProfile,
} from "@/lib/queries"
import { enableDailyReminders } from "@/lib/notifications"
import { buildProfileSnapshot } from "@/lib/utils/use-profile-sync"
import useGamification from "@/lib/utils/use-gamification"
import useTheme, { type ThemePreference } from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { reportError } from "@/lib/sentry"
import NativeMenu from "@/components/shared/ui/native-menu"
import Row from "@/components/shared/ui/row"
import RowGroup from "@/components/shared/ui/row-group"
import Button from "@/components/shared/ui/button"

const APPEARANCE_OPTIONS: { key: ThemePreference; labelKey: string }[] = [
  { key: "system", labelKey: "profile.appearanceSystem" },
  { key: "light", labelKey: "profile.appearanceLight" },
  { key: "dark", labelKey: "profile.appearanceDark" },
]

const SettingsScreen = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { modalColors, mutedTextClass, mutedColors, theme, themePreference, setThemePreference } = useTheme()
  const { user, logOut, deleteAccount, userCollection } = useAuth()
  const { t } = useLocale()
  const { data: remindersEnabled } = useRemindersEnabled(user?.id)
  const { data: notificationPermission } = useNotificationPermission()
  // On only when this device can actually receive the reminder
  const remindersOn = !!notificationPermission?.granted && !!remindersEnabled
  const { data: isModerator } = useIsModerator(user?.id)
  const { data: blockedUsers } = useBlockedUsers(user?.id)
  const { data: myProfile } = useMyProfile(user?.id)
  const gamification = useGamification()
  const [deleting, setDeleting] = useState(false)
  const switchTrack = { true: getColor(theme === "dark" ? "emerald-500" : "emerald-600") }

  // Publishing writes the full snapshot eagerly — without it a just-published
  // profile would sit at zero wears until use-profile-sync's next pass.
  // Upsert so the first-ever write creates the row (is_public defaults false)
  const togglePublicProfile = async (value: boolean) => {
    const showHiddenAlert = () =>
      Alert.alert(t("profile.publicHiddenTitle"), t("profile.publicHiddenMessage"))
    if (value && myProfile?.moderation_hidden_at) {
      showHiddenAlert()
      return
    }
    queryClient.setQueryData(["my-profile", user?.id], (old: UserProfile | null | undefined) =>
      old ? { ...old, is_public: value } : old
    )
    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          { user_id: user!.id, is_public: value, ...buildProfileSnapshot(user!, gamification, userCollection) },
          { onConflict: "user_id" }
        )
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] })
      queryClient.invalidateQueries({ queryKey: ["top-collectors"] })
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] })
      if ((error as { code?: string }).code === PROFILE_HIDDEN_ERROR_CODE) {
        showHiddenAlert()
        return
      }
      reportError(error, { flow: "public-profile-toggle" })
      Alert.alert(t("profile.publicUpdateFailedTitle"), t("profile.publicUpdateFailedMessage"))
    }
  }

  const toggleReminders = async (value: boolean) => {
    if (value) {
      const result = await enableDailyReminders(user!.id)
      queryClient.invalidateQueries({ queryKey: ["notification-permission"] })
      if (result === "blocked") {
        Alert.alert(t("profile.reminderBlockedTitle"), t("profile.reminderBlockedMessage"), [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("profile.openSettings"), onPress: () => Linking.openSettings() },
        ])
        return
      }
      if (result === "failed") {
        Alert.alert(t("profile.reminderUpdateFailedTitle"), t("profile.reminderUpdateFailedMessage"))
        return
      }
    }
    // Optimistic — the switch flips immediately, reverts if the write fails
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
    Alert.alert(t("profile.deleteConfirmTitle"), t("profile.deleteConfirmMessage"), [
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
    ])
  }

  const trailingValue = (value: string | number, icon: keyof typeof MaterialCommunityIcons.glyphMap) => (
    <View className='flex-row items-center' style={{ gap: 4 }}>
      <Text className={`${mutedTextClass} text-base`}>{value}</Text>
      <MaterialCommunityIcons name={icon} size={20} color={getColor(mutedColors)} />
    </View>
  )

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-6 pb-12 items-center'
      showsVerticalScrollIndicator={false}>
      <RowGroup title={t("profile.sectionPreferences")}>
        <NativeMenu
          title={t("profile.appearance")}
          testID='settings-appearance-menu'
          items={APPEARANCE_OPTIONS.map(({ key, labelKey }) => ({
            id: key,
            title: t(labelKey),
            checked: key === themePreference,
            onPress: () => setThemePreference(key),
          }))}>
          <Row
            icon='theme-light-dark'
            label={t("profile.appearance")}
            trailing={trailingValue(
              t(APPEARANCE_OPTIONS.find((o) => o.key === themePreference)!.labelKey),
              "unfold-more-horizontal"
            )}
          />
        </NativeMenu>
        <Row
          icon='bell-outline'
          label={t("profile.dailyReminder")}
          trailing={
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              accessibilityLabel={t("profile.dailyReminder")}
              trackColor={switchTrack}
            />
          }
        />
        <Row
          icon='earth'
          label={t("profile.publicProfile")}
          testID='profile-public-toggle-row'
          trailing={
            <Switch
              value={myProfile?.is_public ?? false}
              onValueChange={togglePublicProfile}
              accessibilityLabel={t("profile.publicProfile")}
              trackColor={switchTrack}
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
        {(blockedUsers?.length ?? 0) > 0 && (
          <Row
            icon='account-cancel-outline'
            label={t("profile.blockedUsersRow")}
            testID='profile-blocked-users-row'
            onPress={() => router.push("/blocked-users")}
            trailing={trailingValue(blockedUsers!.length, "chevron-right")}
          />
        )}
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
    </ScrollView>
  )
}

export default SettingsScreen
