import React, { useMemo, useState } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useAuth from "@/contexts/auth-context"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { useWearHistory } from "@/lib/queries"
import { computeGamification } from "@/lib/gamification"
import { bestStreakWithin, isInRange, monthRangeForKey, previousMonthKey } from "@/lib/utils/recap-month"
import { buildMonthlyRecapShareText, displayFragranceName } from "@/lib/share"
import Card from "@/components/card"
import BadgeTile from "@/components/badge-tile"
import EmptyState from "@/components/shared/ui/empty-state"
import StatTile from "@/components/shared/ui/stat-tile"
import ShareSheetModal from "@/components/share-sheet-modal"

// One month-of-events aggregate, computed client-side from the full personal
// wear diary — no new RPC needed, `useWearHistory` already returns everything.
interface MonthTopEntry {
  name: string
  image_url: string | null
  count: number
}

const MonthlyRecapScreen = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ month?: string }>()
  const { user, userCollection } = useAuth()
  const { viewColors, baseTextClass, mutedTextClass, mutedColors, baseBorderClass } = useTheme()
  const { t, formatDate } = useLocale()
  const { data: allEvents } = useWearHistory(user?.id)
  const [shareVisible, setShareVisible] = useState(false)

  const monthKey = params.month ?? previousMonthKey()
  const { start, end } = useMemo(() => monthRangeForKey(monthKey), [monthKey])
  const monthLabel = formatDate(start, { month: "long" })
  const events = allEvents ?? []

  const monthEvents = useMemo(
    () => events.filter((e) => isInRange(e.worn_at, { start, end })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, monthKey]
  )

  const totalWears = monthEvents.length
  const distinctFragrances = useMemo(() => new Set(monthEvents.map((e) => e.name)).size, [monthEvents])

  const topThree = useMemo<MonthTopEntry[]>(() => {
    const byName = new Map<string, MonthTopEntry>()
    for (const e of monthEvents) {
      const existing = byName.get(e.name)
      if (existing) existing.count++
      else byName.set(e.name, { name: e.name, image_url: e.image_url, count: 1 })
    }
    return Array.from(byName.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [monthEvents])

  const bestStreak = useMemo(() => bestStreakWithin(monthEvents), [monthEvents])

  // Two-snapshot diff: everything the user had earned as of the start of the
  // month vs. as of the end of it. `now` is pinned to each boundary so the
  // streak component of each snapshot reflects that point in time, not today.
  const monthStartState = useMemo(
    () =>
      computeGamification({
        events: events.filter((e) => new Date(e.worn_at) < start),
        collection: userCollection,
        now: start,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, userCollection, monthKey]
  )
  const monthEndState = useMemo(
    () =>
      computeGamification({
        events: events.filter((e) => new Date(e.worn_at) < end),
        collection: userCollection,
        now: end,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, userCollection, monthKey]
  )

  const newBadges = useMemo(() => {
    const earnedAtStart = new Set(monthStartState.badges.filter((b) => b.earned).map((b) => b.id))
    return monthEndState.badges.filter((b) => b.earned && !earnedAtStart.has(b.id))
  }, [monthStartState, monthEndState])

  const xpGained = monthEndState.xp - monthStartState.xp

  const shareMessage = useMemo(
    () =>
      buildMonthlyRecapShareText(t, {
        month: monthLabel,
        wears: totalWears,
        topFragranceName: topThree[0] ? displayFragranceName(topThree[0].name) : null,
        streak: bestStreak,
        badgesCount: newBadges.length,
        levelTitle: t(monthEndState.levelTitle),
      }),
    [t, monthLabel, totalWears, topThree, bestStreak, newBadges.length, monthEndState.levelTitle]
  )

  const isEmpty = totalWears === 0

  return (
    <View className={`${viewColors.background} flex-1`}>
      {/* fullScreenModal, closed via X only — same reasoning as picker.tsx:
          a sheet presentation would let a downward drag fight the scroll view */}
      <TouchableOpacity
        className='absolute right-4 z-10 h-10 w-10 items-center justify-center'
        style={{ top: insets.top + 8 }}
        testID='monthly-recap-close'
        onPress={() => router.back()}>
        <AntDesign name='close' size={26} color={getColor(mutedColors)} />
      </TouchableOpacity>
      {!isEmpty && (
        <TouchableOpacity
          className='absolute left-4 z-10 h-10 w-10 items-center justify-center'
          style={{ top: insets.top + 8 }}
          accessibilityRole='button'
          accessibilityLabel={t("share.action")}
          testID='monthly-recap-share'
          onPress={() => setShareVisible(true)}>
          <MaterialCommunityIcons name='share-variant' size={24} color={getColor(mutedColors)} />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: 48,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}>
        <View className='items-center pb-8'>
          <Text className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider`}>
            {t("recap.eyebrow")}
          </Text>
          <Text className={`${baseTextClass} font-display text-4xl text-center pt-2`}>
            {t("recap.heroTitle", { month: monthLabel })}
          </Text>
          <Text className={`${mutedTextClass} text-base text-center pt-2`}>{t("recap.heroSubtitle")}</Text>
        </View>

        {isEmpty ? (
          <EmptyState
            icon='calendar-blank-outline'
            title={t("recap.emptyTitle")}
            message={t("recap.emptyMessage", { month: monthLabel })}
          />
        ) : (
          <>
            <StatTile
              items={[
                { value: totalWears, label: t("recap.totalWearsLabel") },
                { value: distinctFragrances, label: t("recap.distinctLabel") },
              ]}
              columns={2}
            />

            {topThree.length > 0 && (
              <View className='pt-8'>
                <Text
                  className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider pb-3`}>
                  {t("recap.topThreeTitle")}
                </Text>
                {topThree.map((entry, i) => {
                  const [brand, title] = entry.name.split(" - ")
                  return (
                    <Card.Root key={entry.name}>
                      <Card.Rank place={i + 1} />
                      <Card.Thumbnail imageUrl={entry.image_url} />
                      <Card.Content>
                        <Card.Title>{title ?? brand}</Card.Title>
                        {title && <Card.Subtitle>{brand}</Card.Subtitle>}
                        <Card.WearInfoText community timesWorn={entry.count} />
                      </Card.Content>
                    </Card.Root>
                  )
                })}
              </View>
            )}

            <View className={`items-center rounded-2xl border ${baseBorderClass} mt-8 py-6`}>
              <View className='flex-row items-center' style={{ gap: 8 }}>
                <MaterialCommunityIcons
                  name='fire'
                  size={28}
                  color={getColor(bestStreak > 0 ? "orange-500" : mutedColors)}
                />
                <Text className={`${baseTextClass} text-4xl font-bold`}>{bestStreak}</Text>
              </View>
              <Text className={`${mutedTextClass} text-sm pt-1`}>
                {t("recap.bestStreakLabel", { count: bestStreak })}
              </Text>
            </View>

            <View className='pt-8'>
              <Text className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider pb-3`}>
                {t("recap.newBadgesTitle")}
              </Text>
              {newBadges.length > 0 ? (
                <View className='flex-row flex-wrap' style={{ gap: 10 }}>
                  {newBadges.map((badge) => (
                    <BadgeTile key={badge.id} badge={badge} size='sm' />
                  ))}
                </View>
              ) : (
                <Text className={`${mutedTextClass} text-sm`}>{t("recap.noNewBadges")}</Text>
              )}
            </View>

            <View className='pt-8'>
              <Text className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider pb-3`}>
                {t("recap.levelSectionTitle")}
              </Text>
              <StatTile
                items={[
                  { value: monthEndState.level, label: t("recap.levelLabel") },
                  { value: `+${xpGained}`, label: t("recap.xpGainedLabel") },
                ]}
                columns={2}
              />
              <Text className={`${mutedTextClass} text-sm text-center pt-3`}>
                {t(monthEndState.levelTitle)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <ShareSheetModal
        visible={shareVisible}
        title={t("share.sheetTitleMonthlyRecap")}
        message={shareMessage}
        onClose={() => setShareVisible(false)}
      />
    </View>
  )
}

export default MonthlyRecapScreen
