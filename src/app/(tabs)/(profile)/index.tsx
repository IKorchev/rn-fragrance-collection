import React, { useMemo, useState } from "react"
import { ScrollView, View, Text, Alert, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import { supabase } from "@/lib/supabase"
import { useMyProfile, useWearHistory, useWishlist, type UserProfile } from "@/lib/queries"
import {
  pickHeaderPhoto,
  uploadHeaderPhoto,
  removeHeaderPhotoObject,
  headerPhotoUrl,
  type HeaderPhotoSource,
} from "@/lib/profile-header-photo"
import { purchasesEnabled, presentPaywall, PAYWALL_RESULT } from "@/lib/purchases"
import { FREE_COLLECTION_LIMIT } from "@/lib/entitlements"
import { isWornToday } from "@/lib/utils/worn-today"
import { buildTodaysScentShareText } from "@/lib/share"
import useTheme from "@/contexts/theme-context"
import useToast from "@/contexts/toast-context"
import useAuth from "@/contexts/auth-context"
import useLocale from "@/contexts/locale-context"
import { reportError } from "@/lib/sentry"
import useGamification from "@/lib/utils/use-gamification"
import { useTabBottomPadding } from "@/lib/utils/use-tab-bottom-padding"
import { pickHighlightBadges } from "@/lib/utils/badge-highlights"
import { useMonthlyRecapPrompt } from "@/lib/utils/use-monthly-recap-prompt"
import Badge from "@/components/shared/ui/badge"
import NativeMenu, { type NativeMenuItem } from "@/components/shared/ui/native-menu"
import GlassCircle from "@/components/shared/ui/glass-circle"
import ProfileHero from "@/components/profile-hero"
import Row from "@/components/shared/ui/row"
import RowGroup from "@/components/shared/ui/row-group"
import StatTile from "@/components/shared/ui/stat-tile"
import ShareSheetModal from "@/components/share-sheet-modal"
import WearHeatmap from "@/components/wear-heatmap"
import BadgeTile from "@/components/badge-tile"

const ProfileScreen = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { modalColors, baseTextClass, mutedTextClass, mutedColors, theme } = useTheme()
  const { user, userCollection, isPro } = useAuth()
  const { showToast } = useToast()
  const { t, formatDate } = useLocale()
  const bottomPadding = useTabBottomPadding(48)
  const { data: events } = useWearHistory(user?.id)
  const { data: wishlist } = useWishlist(user?.id)
  // Once-per-month "your recap is ready" toast — fires at most once per
  // calendar month, see use-monthly-recap-prompt.ts for the AsyncStorage marker.
  useMonthlyRecapPrompt()
  const [todayShareVisible, setTodayShareVisible] = useState(false)
  const [headerBusy, setHeaderBusy] = useState(false)
  // Optimistic local render of a just-picked photo — the remote public URL
  // only takes over on the next mount, so the hero never sits on a spinner
  // waiting for the scan + upload + re-download round trip
  const [localHeaderUri, setLocalHeaderUri] = useState<string | null>(null)
  const { data: myProfile } = useMyProfile(user?.id)
  const headerUrl = localHeaderUri ?? headerPhotoUrl(myProfile?.header_image_path)

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? t("profile.anonymous")
  const totalWears = userCollection.reduce((sum, el) => sum + el.times_worn, 0)
  const memberSince = user?.created_at
    ? formatDate(new Date(user.created_at), { month: "long", year: "numeric" })
    : null

  // Streak and badges come from the shared gamification core (src/lib/gamification)
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

  const todayMessage = useMemo(
    () => (todayFragrance ? buildTodaysScentShareText(t, { name: todayFragrance.name }) : ""),
    [t, todayFragrance]
  )

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

  // Upsert so the first-ever write creates the row (PostgREST
  // merge-duplicates only touches the provided columns on conflict)
  const upsertProfilePatch = async (patch: Partial<UserProfile>) => {
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: user!.id, ...patch }, { onConflict: "user_id" })
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] })
  }

  const applyHeaderPhoto = async (source: HeaderPhotoSource) => {
    const pick = await pickHeaderPhoto(source)
    if (pick.status === "denied") {
      Alert.alert(t("profile.headerPhoto.permissionTitle"), t("profile.headerPhoto.permissionMessage"))
      return
    }
    if (pick.status === "canceled") return
    setHeaderBusy(true)
    setLocalHeaderUri(pick.uri)
    try {
      // The edge function scans, stores, updates the profile row, and sweeps
      // old objects — a refetch is all that's left client-side
      const result = await uploadHeaderPhoto(pick.uri)
      if (result.status === "rejected") {
        setLocalHeaderUri(null)
        showToast({ message: t("profile.headerPhoto.rejected") })
        return
      }
      await queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] })
      showToast({ message: t("profile.headerPhoto.saved") })
    } catch (error) {
      setLocalHeaderUri(null)
      reportError(error, { flow: "profile-header-photo" })
      showToast({ message: t("profile.headerPhoto.failed") })
    } finally {
      setHeaderBusy(false)
    }
  }

  const removeHeaderPhoto = async () => {
    const oldPath = myProfile?.header_image_path
    if (!oldPath) return
    setHeaderBusy(true)
    setLocalHeaderUri(null)
    try {
      await upsertProfilePatch({ header_image_path: null })
      removeHeaderPhotoObject(oldPath)
      showToast({ message: t("profile.headerPhoto.removed") })
    } catch (error) {
      reportError(error, { flow: "profile-header-photo" })
      showToast({ message: t("profile.headerPhoto.failed") })
    } finally {
      setHeaderBusy(false)
    }
  }

  const headerPhotoMenuItems: NativeMenuItem[] = [
    {
      id: "camera",
      title: t("profile.headerPhoto.take"),
      icon: "camera",
      onPress: () => applyHeaderPhoto("camera"),
    },
    {
      id: "library",
      title: t("profile.headerPhoto.choose"),
      icon: "photo.on.rectangle",
      onPress: () => applyHeaderPhoto("library"),
    },
    ...(myProfile?.header_image_path
      ? [
          {
            id: "remove",
            title: t("profile.headerPhoto.remove"),
            icon: "trash" as const,
            destructive: true,
            onPress: removeHeaderPhoto,
          },
        ]
      : []),
  ]

  return (
    <View className={`flex-1 ${modalColors.background}`}>
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerClassName='px-5 pt-2 items-center'
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}>
      <ProfileHero
        headerImageUrl={headerUrl}
        avatarUrl={user?.photoURL}
        name={displayName}
        subtitles={[
          user?.email ?? null,
          memberSince ? t("profile.memberSince", { date: memberSince }) : null,
        ].filter((line): line is string => !!line)}
        badge={isPro ? <Badge label='PRO' /> : undefined}
        trailing={
          <NativeMenu
            title={t("profile.headerPhoto.title")}
            items={headerPhotoMenuItems.map((item) => ({ ...item, disabled: headerBusy }))}
            testID='profile-header-photo-button'>
            <GlassCircle
              fallbackBgClassName={headerUrl ? "bg-black/40" : theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}
              dimmed={headerBusy}
              accessibilityLabel={t("profile.headerPhoto.buttonLabel")}>
              {headerBusy ? (
                <ActivityIndicator size='small' color={headerUrl ? "white" : getColor(mutedColors)} />
              ) : (
                <MaterialCommunityIcons
                  name='camera-outline'
                  size={22}
                  color={headerUrl ? "white" : getColor(mutedColors)}
                />
              )}
            </GlassCircle>
          </NativeMenu>
        }
      />

      <View className='w-full mt-6'>
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

      <WearHeatmap events={events ?? []} className='mt-6' />

      <RowGroup title={t("profile.sectionActivity")} className='mt-8'>
        <Row
          icon='history'
          label={t("profile.wearHistoryRow")}
          onPress={() => router.push("/wear-history")}
        />
        <Row
          icon='bookmark-outline'
          label={t("wishlist.row")}
          testID='profile-wishlist-row'
          onPress={() => router.push("/wishlist")}
          trailing={
            wishlist?.length ? (
              <View className='flex-row items-center' style={{ gap: 4 }}>
                <Text className={`${mutedTextClass} text-base`}>{wishlist.length}</Text>
                <MaterialCommunityIcons name='chevron-right' size={20} color={getColor(mutedColors)} />
              </View>
            ) : undefined
          }
        />
        <Row
          icon='calendar-star'
          label={t("recap.entryRow")}
          testID='profile-monthly-recap-row'
          onPress={() => router.push("/monthly-recap")}
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

      {todayFragrance && (
        <ShareSheetModal
          visible={todayShareVisible}
          title={t("share.sheetTitleToday")}
          message={todayMessage}
          onClose={() => setTodayShareVisible(false)}
        />
      )}
    </ScrollView>
    </View>
  )
}

export default ProfileScreen
