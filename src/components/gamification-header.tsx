import React from "react"
import { Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import type { GamificationState } from "@/lib/gamification"

interface GamificationHeaderProps {
  state: GamificationState
  className?: string
}

// Compact glanceable summary for the top of the Profile screen: level +
// title, an XP progress bar toward the next level, and the current streak —
// one card, no drill-in required. Badge detail is progressive disclosure via
// the "See all badges" row rendered separately below this.
const GamificationHeader = ({ state, className }: GamificationHeaderProps) => {
  const { t } = useLocale()
  const { baseTextClass, mutedTextClass, mutedColors, accentColors, accentTintBg, baseBorderClass, theme } =
    useTheme()

  const isMaxLevel = state.xpForNextLevel === 0
  const barPct = isMaxLevel ? 100 : Math.max(Math.round(state.levelProgress * 100), 4)
  const streakLabel = t("gamification.header.streakLabel", { count: state.streak })

  return (
    <View className={`w-full rounded-2xl border ${baseBorderClass} p-4 ${className ?? ""}`}>
      <View className='flex-row items-center justify-between'>
        <View className='flex-row items-center flex-1' style={{ gap: 10 }}>
          <View
            className='w-10 h-10 rounded-full items-center justify-center'
            style={{ backgroundColor: accentTintBg }}>
            <Text className={`${baseTextClass} text-sm font-bold`}>{state.level}</Text>
          </View>
          <View className='flex-1'>
            <Text
              className={`${mutedTextClass} text-xs font-semibold uppercase tracking-wider`}
              numberOfLines={1}>
              {t("gamification.header.levelLabel", { level: state.level })}
            </Text>
            <Text className={`${baseTextClass} text-base font-bold`} numberOfLines={1}>
              {t(state.levelTitle)}
            </Text>
          </View>
        </View>

        <View
          className='flex-row items-center pl-2'
          style={{ gap: 4 }}
          accessibilityLabel={streakLabel}>
          <MaterialCommunityIcons
            name='fire'
            size={20}
            color={getColor(state.streak > 0 ? "orange-500" : mutedColors)}
          />
          <Text className={`${baseTextClass} text-base font-bold`}>{state.streak}</Text>
        </View>
      </View>

      <View
        className={`h-2 rounded-full mt-3 overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-black/5"}`}>
        <View
          className='h-full rounded-full'
          style={{ width: `${barPct}%`, backgroundColor: getColor(accentColors) }}
        />
      </View>
      <Text className={`${mutedTextClass} text-xs pt-1.5`}>
        {isMaxLevel
          ? t("gamification.header.maxLevelXp", { xp: state.xp })
          : t("gamification.header.xpToNext", { current: state.xpIntoLevel, target: state.xpForNextLevel })}
      </Text>
    </View>
  )
}

export default GamificationHeader
