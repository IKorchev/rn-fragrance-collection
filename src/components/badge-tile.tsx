import React from "react"
import { Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import type { EarnedBadge } from "@/lib/gamification"

interface BadgeTileProps {
  badge: EarnedBadge
  // "sm" — Profile's 3-badge preview row (fixed width, sits in a horizontal
  // row). "md" — the full badge wall grid (flexes to fill its grid cell).
  size?: "sm" | "md"
}

// Single badge tile: earned badges get the full accent treatment, locked
// ones go muted with a "current/target" progress hint instead of the name's
// description (so a locked tile still tells you how close you are).
const BadgeTile = ({ badge, size = "md" }: BadgeTileProps) => {
  const { t } = useLocale()
  const { baseTextClass, mutedTextClass, baseBorderClass, accentColors, accentTintBg, mutedColors } = useTheme()

  const iconSize = size === "sm" ? 26 : 30
  const widthClass = size === "sm" ? "w-24" : "w-full"
  const badgeColor = badge.earned ? getColor(accentColors) : getColor(mutedColors)
  const iconBg = badge.earned ? accentTintBg : undefined

  return (
    <View
      className={`items-center rounded-2xl border ${baseBorderClass} px-2 py-3 ${widthClass} ${badge.earned ? "" : "opacity-70"}`}>
      <View
        className='w-14 h-14 rounded-full items-center justify-center'
        style={{ backgroundColor: iconBg }}>
        <MaterialCommunityIcons
          name={badge.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={iconSize}
          color={badgeColor}
        />
      </View>
      <Text
        numberOfLines={1}
        className={`${badge.earned ? baseTextClass : mutedTextClass} text-xs font-semibold text-center pt-2`}>
        {t(`gamification.badges.${badge.id}.name`)}
      </Text>
      {badge.earned ? (
        size === "md" && (
          <Text className={`${mutedTextClass} text-[11px] text-center pt-0.5`} numberOfLines={2}>
            {t(`gamification.badges.${badge.id}.description`)}
          </Text>
        )
      ) : (
        <Text className={`${mutedTextClass} text-[11px] text-center pt-0.5`}>
          {t("gamification.badgeWall.lockedProgress", { current: badge.current, target: badge.target })}
        </Text>
      )}
    </View>
  )
}

export default BadgeTile
