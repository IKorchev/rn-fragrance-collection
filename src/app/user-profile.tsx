import React, { useMemo, useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import { reportError } from "@/lib/sentry"
import { useBlockedUsers, usePublicProfile, useUserTopWorn } from "@/lib/queries"
import { headerPhotoUrl } from "@/lib/profile-header-photo"
import { BADGE_DEFINITIONS, type EarnedBadge } from "@/lib/gamification"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import ProfileHero from "@/components/profile-hero"
import BadgeTile from "@/components/badge-tile"
import Card from "@/components/card"
import StatTile from "@/components/shared/ui/stat-tile"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"
import NativeMenu, { type NativeMenuItem } from "@/components/shared/ui/native-menu"
import GlassCircle from "@/components/shared/ui/glass-circle"

// Another collector's public profile, pushed from the Collectors leaderboard.
// Everything shown is either their self-reported snapshot (streak/
// badges/counts — see user_profiles in db/schema.sql) or real wear_events
// aggregates via the user_top_worn RPC. Deliberately NOT shown: their
// collection list, personal notes/ratings, or wear diary — is_public only
// opts into this summary.
//
// App Review 1.2: the header's overflow menu (hidden on your own profile)
// reports the profile (report-profile.tsx) or blocks the user — user_blocks
// makes the blocked profile read as private server-side, so it drops out of
// Collectors once the profile queries refetch.
const UserProfileScreen = () => {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const { theme, modalColors, baseTextClass, headerColors } = useTheme()
  const { t } = useLocale()
  const { user, blockUser, unblockUser } = useAuth()
  const { showToast } = useToast()
  const [unblocking, setUnblocking] = useState(false)
  const { data: profile, isPending } = usePublicProfile(userId)
  const { data: topWorn } = useUserTopWorn(profile?.is_public ? userId : undefined)
  const { data: blockedUsers } = useBlockedUsers(user?.id)
  const blocked = blockedUsers?.some((b) => b.blockedId === userId) ?? false
  const isOwnProfile = user?.id === userId
  const displayName = profile?.display_name || t("profile.anonymous")

  const confirmBlock = () => {
    Alert.alert(
      t("userProfile.blockConfirmTitle", { name: displayName }),
      t("userProfile.blockConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("userProfile.blockConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(userId, {
                displayName: profile?.display_name ?? null,
                avatarUrl: profile?.avatar_url ?? null,
              })
              router.back()
              showToast({ message: t("userProfile.blocked", { name: displayName }) })
            } catch (error) {
              reportError(error, { flow: "block-user" })
              Alert.alert(t("userProfile.block"), t("userProfile.blockFailed"))
            }
          },
        },
      ]
    )
  }

  const actionItems: NativeMenuItem[] = [
    {
      id: "report",
      title: t("userProfile.report"),
      icon: "flag",
      onPress: () =>
        router.push({
          pathname: "/report-profile",
          params: { userId, name: displayName, avatarUrl: profile?.avatar_url ?? "" },
        }),
    },
    {
      id: "block",
      title: t("userProfile.block"),
      icon: "hand.raised",
      destructive: true,
      onPress: confirmBlock,
    },
  ]

  const handleUnblock = async () => {
    setUnblocking(true)
    try {
      await unblockUser(userId)
    } catch (error) {
      reportError(error, { flow: "unblock-user" })
      showToast({ message: t("blockedUsers.unblockFailed") })
    } finally {
      setUnblocking(false)
    }
  }

  const headerActions = (
    <Stack.Screen
      options={{
        headerRight: () =>
          !isOwnProfile && profile?.is_public ? (
            <NativeMenu title={displayName} items={actionItems} testID='user-profile-actions'>
              <GlassCircle
                fallbackBgClassName={theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}
                accessibilityLabel={t("userProfile.moreActions")}>
                <MaterialCommunityIcons
                  name='dots-horizontal'
                  size={24}
                  color={getColor(headerColors.font.replace("text-", ""))}
                />
              </GlassCircle>
            </NativeMenu>
          ) : null,
      }}
    />
  )

  // The snapshot stores earned badge ids; the badge objects are re-derived
  // from the same definitions the owner's device used
  const earnedBadges = useMemo<EarnedBadge[]>(
    () =>
      BADGE_DEFINITIONS.filter((def) => profile?.badge_ids.includes(def.id)).map((def) => ({
        ...def,
        earned: true,
        progress: 1,
        current: def.target,
      })),
    [profile]
  )

  if (isPending) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        {headerActions}
        <SkeletonList count={5} />
      </View>
    )
  }

  if (blocked) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        {headerActions}
        <EmptyState
          icon='account-cancel-outline'
          title={t("userProfile.blockedTitle")}
          message={t("userProfile.blockedMessage")}
          actionLabel={unblocking ? t("blockedUsers.unblocking") : t("userProfile.unblock")}
          onAction={unblocking ? undefined : handleUnblock}
        />
      </View>
    )
  }

  if (!profile || !profile.is_public) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        {headerActions}
        <EmptyState
          icon='incognito'
          title={t("userProfile.privateTitle")}
          message={t("userProfile.privateMessage")}
        />
      </View>
    )
  }

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      contentContainerClassName='px-5 items-center'
      showsVerticalScrollIndicator={false}>
      {headerActions}
      <ProfileHero
        headerImageUrl={headerPhotoUrl(profile.header_image_path)}
        avatarUrl={profile.avatar_url}
        name={displayName}
        className='mt-4'
      />

      <StatTile
        className='mt-4'
        items={[
          { value: profile.collection_count, label: t("profile.stats.inCollection") },
          { value: profile.total_wears, label: t("profile.stats.totalWears") },
          { value: profile.streak, label: t("profile.stats.dayStreak", { count: profile.streak }) },
        ]}
      />

      {earnedBadges.length > 0 && (
        <View className='w-full mt-6'>
          <Text className={`${baseTextClass} text-lg font-bold pb-3`}>
            {t("userProfile.badgesTitle")}
          </Text>
          <View className='flex-row flex-wrap' style={{ gap: 10 }}>
            {earnedBadges.map((badge) => (
              <BadgeTile key={badge.id} badge={badge} size='sm' />
            ))}
          </View>
        </View>
      )}

      {(topWorn ?? []).length > 0 && (
        <View className='w-full mt-6'>
          <Text className={`${baseTextClass} text-lg font-bold pb-1`}>
            {t("userProfile.topWornTitle")}
          </Text>
          {(topWorn ?? []).map((item, index) => {
            const [brand, ...titleParts] = item.name.split(" - ")
            return (
              <Card.Root key={item.name}>
                <Card.Rank place={index + 1} />
                <Card.Thumbnail imageUrl={item.image_url} />
                <Card.Content>
                  <Card.Title>{titleParts.join(" - ") || brand}</Card.Title>
                  {titleParts.length > 0 && <Card.Subtitle>{brand}</Card.Subtitle>}
                  <Card.WearInfoText community timesWorn={item.wear_count} />
                </Card.Content>
              </Card.Root>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

export default UserProfileScreen
