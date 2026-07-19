import React, { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import useAuth from "@/contexts/auth-context"
import useWeeklyQuests from "@/lib/utils/use-weekly-quests"
import useStreakSaveBudget from "@/lib/utils/use-streak-save-budget"
import Dialog from "@/components/shared/ui/dialog"
import type { ActiveQuest } from "@/lib/gamification"

const QuestRow = ({ quest }: { quest: ActiveQuest }) => {
  const { t } = useLocale()
  const { baseTextClass, mutedTextClass, mutedColors, accentColors, theme } = useTheme()
  const barPct = Math.max(Math.round(quest.progress * 100), quest.current > 0 ? 4 : 0)

  return (
    <View className='pt-4'>
      <View className='flex-row items-start justify-between'>
        <View className='flex-row items-start flex-1' style={{ gap: 6 }}>
          <MaterialCommunityIcons
            name={quest.completed ? "check-circle" : "circle-outline"}
            size={18}
            color={getColor(quest.completed ? accentColors : mutedColors)}
            style={{ marginTop: 1 }}
          />
          <View className='flex-1'>
            <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
              {t(`gamification.quests.${quest.id}.title`)}
            </Text>
            <Text className={`${mutedTextClass} text-xs pt-0.5`} numberOfLines={2}>
              {t(`gamification.quests.${quest.id}.description`)}
            </Text>
          </View>
        </View>
        <Text className={`${mutedTextClass} text-xs pl-2`}>+{quest.xpReward} XP</Text>
      </View>
      <View
        className={`h-1.5 rounded-full mt-2 overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-black/5"}`}>
        <View
          className='h-full rounded-full'
          style={{ width: `${barPct}%`, backgroundColor: getColor(accentColors) }}
        />
      </View>
      <Text className={`${mutedTextClass} text-[11px] pt-1`}>
        {quest.current}/{quest.target}
      </Text>
    </View>
  )
}

interface WeeklyQuestsCardProps {
  className?: string
}

// Compact glanceable card for the Collection tab: collapsed shows just
// "Weekly quests · N/3 done" + a thin overall progress bar; tapping opens a
// small sheet (Dialog) with the 3 active quests, their individual progress
// bars, and — for Pro users — the Streak Saver monthly budget footer (the
// least cluttered spot for it, since Pro users are already looking at their
// gamification standing here).
const WeeklyQuestsCard = ({ className }: WeeklyQuestsCardProps) => {
  const { t } = useLocale()
  const { baseTextClass, mutedTextClass, mutedColors, accentColors, baseBorderClass, cardBorderColors, theme } =
    useTheme()
  const { isPro } = useAuth()
  const quests = useWeeklyQuests()
  const budget = useStreakSaveBudget()
  const [expanded, setExpanded] = useState(false)

  if (quests.length === 0) return null

  const doneCount = quests.filter((q) => q.completed).length
  const overallPct = Math.round(
    (quests.reduce((sum, q) => sum + q.progress, 0) / quests.length) * 100
  )

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(true)}
        testID='weekly-quests-card'
        accessibilityRole='button'
        accessibilityLabel={`${t("gamification.quests.cardTitle")}, ${t("gamification.quests.doneCount", {
          done: doneCount,
          total: quests.length,
        })}`}
        className={`rounded-2xl border ${baseBorderClass} p-4 ${className ?? ""}`}>
        <View className='flex-row items-center justify-between'>
          <View className='flex-row items-center flex-1' style={{ gap: 8 }}>
            <MaterialCommunityIcons name='trophy-variant-outline' size={18} color={getColor(accentColors)} />
            <Text className={`${baseTextClass} text-sm font-bold`}>{t("gamification.quests.cardTitle")}</Text>
          </View>
          <View className='flex-row items-center' style={{ gap: 4 }}>
            <Text className={`${mutedTextClass} text-xs font-semibold`}>
              {t("gamification.quests.doneCount", { done: doneCount, total: quests.length })}
            </Text>
            <MaterialCommunityIcons name='chevron-right' size={18} color={getColor(mutedColors)} />
          </View>
        </View>
        <View
          className={`h-1.5 rounded-full mt-2.5 overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-black/5"}`}>
          <View
            className='h-full rounded-full'
            style={{ width: `${Math.max(overallPct, 4)}%`, backgroundColor: getColor(accentColors) }}
          />
        </View>
      </TouchableOpacity>

      <Dialog
        visible={expanded}
        title={t("gamification.quests.cardTitle")}
        onClose={() => setExpanded(false)}
        cancelLabel={t("common.close")}>
        {quests.map((quest) => (
          <QuestRow key={quest.id} quest={quest} />
        ))}
        {isPro && budget && (
          <View
            className='flex-row items-center pt-4 mt-4'
            style={{ borderTopWidth: 1, borderTopColor: getColor(cardBorderColors) }}>
            <MaterialCommunityIcons name='shield-check-outline' size={16} color={getColor(accentColors)} />
            <Text className={`${mutedTextClass} text-xs pl-2`}>
              {t("streakSaver.remainingThisMonth", { count: budget.remaining, limit: budget.limit })}
            </Text>
          </View>
        )}
      </Dialog>
    </>
  )
}

export default WeeklyQuestsCard
