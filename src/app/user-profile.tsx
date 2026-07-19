import React, { useMemo } from "react"
import { ScrollView, Text, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { usePublicProfile, useUserTopWorn } from "@/lib/queries"
import { headerPhotoUrl } from "@/lib/profile-header-photo"
import {
  BADGE_DEFINITIONS,
  levelForXp,
  type EarnedBadge,
  type GamificationState,
} from "@/lib/gamification"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import ProfileHero from "@/components/profile-hero"
import GamificationHeader from "@/components/gamification-header"
import BadgeTile from "@/components/badge-tile"
import Card from "@/components/card"
import StatTile from "@/components/shared/ui/stat-tile"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"

// Another collector's public profile, pushed from the Collectors leaderboard.
// Everything shown is either their self-reported snapshot (level/XP/streak/
// badges/counts — see user_profiles in db/schema.sql) or real wear_events
// aggregates via the user_top_worn RPC. Deliberately NOT shown: their
// collection list, personal notes/ratings, or wear diary — is_public only
// opts into this summary.
const UserProfileScreen = () => {
  const insets = useSafeAreaInsets()
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const { modalColors, baseTextClass } = useTheme()
  const { t } = useLocale()
  const { data: profile, isPending } = usePublicProfile(userId)
  const { data: topWorn } = useUserTopWorn(profile?.is_public ? userId : undefined)

  // The snapshot stores raw xp + earned badge ids; level/progress and the
  // badge objects are re-derived with the same pure gamification core the
  // owner's device used, so both ends always agree.
  const state = useMemo<GamificationState | null>(() => {
    if (!profile) return null
    const badges: EarnedBadge[] = BADGE_DEFINITIONS.map((def) => {
      const earned = profile.badge_ids.includes(def.id)
      return { ...def, earned, progress: earned ? 1 : 0, current: earned ? def.target : 0 }
    })
    return {
      xp: profile.xp,
      streak: profile.streak,
      badges,
      earnedCount: badges.filter((b) => b.earned).length,
      ...levelForXp(profile.xp),
    }
  }, [profile])

  const earnedBadges = state?.badges.filter((b) => b.earned) ?? []

  if (isPending) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        <SkeletonList count={5} />
      </View>
    )
  }

  if (!profile || !profile.is_public || !state) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
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
      <ProfileHero
        headerImageUrl={headerPhotoUrl(profile.header_image_path)}
        avatarUrl={profile.avatar_url}
        name={profile.display_name || t("profile.anonymous")}
        className='mt-4'
      />

      <GamificationHeader state={state} className='mt-4' />

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
