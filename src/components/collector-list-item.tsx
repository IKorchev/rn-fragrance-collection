import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import type { UserProfile } from "@/lib/queries"

interface CollectorListItemProps {
  profile: UserProfile
  place: number
}

// One row of the Collectors leaderboard: rank, avatar, name, level + wears
// meta. A people row, not a fragrance row — deliberately not built from the
// Card.* primitives (those stay domain-specific to fragrance lists).
const CollectorListItem = ({ profile, place }: CollectorListItemProps) => {
  const router = useRouter()
  const { t } = useLocale()
  const { theme, baseTextClass, mutedTextClass, mutedColors, cardColors, baseBorderClass } = useTheme()

  // Same medal treatment as Card.Rank, without borrowing the fragrance card
  const rankClass =
    place === 1
      ? "text-amber-400"
      : place === 2
        ? "text-zinc-400"
        : place === 3
          ? "text-amber-700"
          : mutedTextClass

  const name = profile.display_name || t("profile.anonymous")

  return (
    <TouchableOpacity
      className={`flex-row items-center border ${baseBorderClass} ${cardColors.background} rounded-2xl px-4 py-3 mb-2`}
      testID={`collector-row-${place}`}
      onPress={() => router.push({ pathname: "/user-profile", params: { userId: profile.user_id } })}>
      <Text className={`${rankClass} w-7 text-center font-bold ${place <= 3 ? "text-lg" : "text-base"}`}>
        {place}
      </Text>
      <Avatar
        size={44}
        rounded
        source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
        icon={<MaterialCommunityIcons name='account' size={26} color={getColor("zinc-500")} />}
        containerStyle={{
          backgroundColor: getColor(theme === "dark" ? "zinc-800" : "zinc-200"),
          marginLeft: 8,
        }}
      />
      <View className='flex-1 pl-3'>
        <Text className={`${baseTextClass} text-base font-semibold`} numberOfLines={1}>
          {name}
        </Text>
        <Text className={`${mutedTextClass} text-sm pt-0.5`} numberOfLines={1}>
          {t("collectors.meta", { level: profile.level, count: profile.total_wears })}
        </Text>
      </View>
      <MaterialCommunityIcons name='chevron-right' size={22} color={getColor(mutedColors)} />
    </TouchableOpacity>
  )
}

export default CollectorListItem
