import React, { useMemo } from "react"
import { ScrollView, Text, View } from "react-native"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import useGamification from "@/lib/utils/use-gamification"
import BadgeTile from "@/components/badge-tile"
import type { BadgeCategory, EarnedBadge } from "@/lib/gamification"

const CATEGORY_ORDER: BadgeCategory[] = ["streak", "wears", "collection", "explorer", "special"]

const SECTION_KEY: Record<BadgeCategory, string> = {
  streak: "gamification.badgeWall.sectionStreak",
  wears: "gamification.badgeWall.sectionWears",
  collection: "gamification.badgeWall.sectionCollection",
  explorer: "gamification.badgeWall.sectionExplorer",
  special: "gamification.badgeWall.sectionSpecial",
}

// Full badge wall, pushed from Profile's "See all badges" row — every badge
// the core module knows about, grouped by category, earned ones in full
// color and locked ones muted with a "current/target" progress hint.
const BadgesScreen = () => {
  const { t } = useLocale()
  const { modalColors, mutedTextClass } = useTheme()
  const state = useGamification()

  const grouped = useMemo(() => {
    const byCategory = new Map<BadgeCategory, EarnedBadge[]>()
    for (const category of CATEGORY_ORDER) byCategory.set(category, [])
    for (const badge of state.badges) byCategory.get(badge.category)?.push(badge)
    return CATEGORY_ORDER.map((category) => ({ category, badges: byCategory.get(category) ?? [] })).filter(
      (group) => group.badges.length > 0
    )
  }, [state.badges])

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-6 pb-12'
      showsVerticalScrollIndicator={false}>
      <Text className={`${mutedTextClass} text-sm pb-5`}>
        {t("gamification.header.badgesEarned", { count: state.earnedCount, total: state.badges.length })}
      </Text>

      {grouped.map(({ category, badges }) => (
        <View key={category} className='pb-6'>
          <Text className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider pb-3`}>
            {t(SECTION_KEY[category])}
          </Text>
          <View className='flex-row flex-wrap' style={{ gap: 12 }}>
            {badges.map((badge) => (
              <View key={badge.id} className='w-[47%]'>
                <BadgeTile badge={badge} size='md' />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

export default BadgesScreen
