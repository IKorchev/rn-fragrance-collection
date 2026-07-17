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
import useTheme, { type ThemePreference } from "@/contexts/theme-context"
import useToast from "@/contexts/toast-context"
import useAuth from "@/contexts/auth-context"
import { reportError } from "@/lib/sentry"
import Badge from "@/components/shared/ui/badge"
import Dialog from "@/components/shared/ui/dialog"
import Row from "@/components/shared/ui/row"
import StatTile from "@/components/shared/ui/stat-tile"
import Button from "@/components/shared/ui/button"
import WearHeatmap from "@/components/wear-heatmap"

const APPEARANCE_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "Match system" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
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
    danger,
  } = useTheme()
  const { user, logOut, deleteAccount, userCollection, isPro } = useAuth()
  const { showToast } = useToast()
  const { data: remindersEnabled } = useRemindersEnabled(user?.id)
  const { data: isModerator } = useIsModerator(user?.id)
  const { data: events } = useWearHistory(user?.id)
  const [deleting, setDeleting] = useState(false)
  const [appearancePickerOpen, setAppearancePickerOpen] = useState(false)

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "Anonymous"
  const totalWears = userCollection.reduce((sum, el) => sum + el.times_worn, 0)
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
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

  // Presents the native paywall configured in the RevenueCat dashboard.
  // isPro flips reactively (see AuthContext's CustomerInfo listener) once a
  // purchase/restore lands, so this just handles the toast feedback.
  const handleUpgrade = async () => {
    const result = await presentPaywall()
    if (result === PAYWALL_RESULT.PURCHASED) {
      showToast({ message: "Welcome to Pro!" })
    } else if (result === PAYWALL_RESULT.RESTORED) {
      showToast({ message: "Purchases restored" })
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
      Alert.alert("Oops", "Couldn't update your reminder setting, please try again.")
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, collection, and wear history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteAccount()
              // Auth state flips to signed-out and the Protected stack swaps
              // to the sign-in screen — nothing left to dismiss here.
            } catch (error) {
              reportError(error, { flow: "delete-account" })
              Alert.alert(
                "Deletion failed",
                "Something went wrong, please try again later."
              )
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
        <Text className={`${mutedTextClass} text-sm pt-1`}>Member since {memberSince}</Text>
      )}

      {purchasesEnabled && (!isPro || __DEV__) && (
        <Row
          icon='star-four-points'
          tone='accent'
          className='mt-6 w-full'
          label={isPro ? "View paywall (dev)" : "Upgrade to Pro"}
          onPress={handleUpgrade}
        />
      )}

      <StatTile
        className='mt-8'
        items={[
          { value: userCollection.length, label: "In collection" },
          { value: totalWears, label: "Total wears" },
        ]}
      />

      <StatTile
        className='mt-4'
        items={[
          { value: monthWears, label: "This month" },
          { value: streak, label: `Day streak${streak === 1 ? "" : "s"}` },
        ]}
      />

      {mostWorn && (
        <Text className={`${mutedTextClass} text-sm pt-3`}>
          Most worn:{" "}
          <Text className={`${baseTextClass} font-semibold`}>
            {mostWorn.name.split(" - ").slice(1).join(" - ")}
          </Text>{" "}
          ({mostWorn.times_worn}x)
        </Text>
      )}

      <WearHeatmap events={events ?? []} className='mt-6' />

      <Row icon='history' className='mt-6' label='Wear history' onPress={() => router.push("/wear-history")} />

      {isModerator && (
        <Row
          icon='shield-check-outline'
          className='mt-4'
          label='Moderation queue'
          onPress={() => router.push("/moderation")}
        />
      )}

      {/* Theme moved here from the header — appearance is a settings concern */}
      <Row
        icon='theme-light-dark'
        className='mt-4'
        label='Appearance'
        onPress={() => setAppearancePickerOpen(true)}
        trailing={
          <View className='flex-row items-center' style={{ gap: 4 }}>
            <Text className={`${mutedTextClass} text-base`}>
              {APPEARANCE_OPTIONS.find((o) => o.key === themePreference)?.label}
            </Text>
            <MaterialCommunityIcons name='chevron-right' size={20} color={getColor(mutedColors)} />
          </View>
        }
      />

      <Dialog
        visible={appearancePickerOpen}
        title='Appearance'
        onClose={() => setAppearancePickerOpen(false)}>
        {APPEARANCE_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            className='flex-row items-center justify-between py-3'
            onPress={() => {
              setThemePreference(key)
              setAppearancePickerOpen(false)
            }}>
            <Text className={key === themePreference ? `${accentTextClass} font-semibold` : baseTextClass}>
              {label}
            </Text>
            {key === themePreference && (
              <MaterialCommunityIcons name='check' size={18} color={getColor(accentColors)} />
            )}
          </TouchableOpacity>
        ))}
      </Dialog>

      <Row
        icon='bell-outline'
        className='mt-4'
        label='Daily wear reminder'
        trailing={
          <Switch
            value={remindersEnabled ?? true}
            onValueChange={toggleReminders}
            trackColor={{ true: getColor(theme === "dark" ? "emerald-500" : "emerald-600") }}
          />
        }
      />

      <Row
        icon='shield-lock-outline'
        className='mt-4'
        label='Privacy Policy'
        onPress={() => router.push("/privacy-policy")}
      />

      <Row
        icon='file-document-outline'
        className='mt-4'
        label='Terms & Conditions'
        onPress={() => router.push("/terms")}
      />

      <TouchableOpacity
        onPress={logOut}
        className={`${danger.bgClass} flex-row items-center justify-center w-full mt-8 py-3 rounded-2xl`}>
        <MaterialCommunityIcons name='logout' size={20} color={getColor(danger.color)} />
        <Text className={`${danger.textClass} text-base font-semibold pl-2`}>Sign out</Text>
      </TouchableOpacity>

      {/* App Store 5.1.1(v) / Play policy: account deletion must be in-app */}
      <Button
        variant='ghost'
        tone='danger'
        size='sm'
        className='mt-6'
        label='Delete account'
        loading={deleting}
        loadingLabel='Deleting account…'
        onPress={handleDeleteAccount}
      />
    </ScrollView>
  )
}

export default ProfileScreen
