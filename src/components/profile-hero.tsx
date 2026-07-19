import React, { type ReactNode } from "react"
import { ImageBackground, Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"

interface ProfileHeroProps {
  // Public URL of the collection header photo — null renders the plain
  // (pre-photo) centered identity block on the screen background
  headerImageUrl: string | null
  avatarUrl?: string | null
  name: string
  // Secondary muted lines under the name (email, member-since)
  subtitles?: string[]
  // Rendered inline after the name — the PRO badge
  badge?: ReactNode
  // Pinned top-right over the hero — the owner's camera button
  trailing?: ReactNode
  className?: string
}

// Identity header for the Profile tab and the public-profile screen: avatar +
// name (+ optional subtitle lines), with the user's collection photo filling
// the card behind them when they've set one. Text flips to white over a dark
// scrim in that case, so both variants stay glanceable.
const ProfileHero = ({
  headerImageUrl,
  avatarUrl,
  name,
  subtitles = [],
  badge,
  trailing,
  className,
}: ProfileHeroProps) => {
  const { theme, baseTextClass, mutedTextClass } = useTheme()
  const hasPhoto = !!headerImageUrl

  const nameClass = hasPhoto ? "text-white" : baseTextClass
  const subtitleClass = hasPhoto ? "text-white/80" : mutedTextClass

  const identity = (
    <View className='items-center w-full px-5 pt-6 pb-5'>
      <Avatar
        size={96}
        rounded
        source={avatarUrl ? { uri: avatarUrl } : undefined}
        icon={<MaterialCommunityIcons name='account' size={56} color={getColor("zinc-500")} />}
        containerStyle={{
          backgroundColor: getColor(theme === "dark" ? "zinc-800" : "zinc-200"),
          borderWidth: hasPhoto ? 2 : 0,
          borderColor: "white",
        }}
      />
      <View className='flex-row items-center pt-4' style={{ gap: 6 }}>
        <Text className={`${nameClass} text-2xl font-bold`} numberOfLines={1}>
          {name}
        </Text>
        {badge}
      </View>
      {subtitles.map((line, index) => (
        <Text key={line} className={`${subtitleClass} ${index === 0 ? "text-base" : "text-sm"} pt-1`}>
          {line}
        </Text>
      ))}
    </View>
  )

  if (!hasPhoto) {
    return (
      <View className={`w-full ${className ?? ""}`}>
        {identity}
        {trailing && <View className='absolute top-2 right-0'>{trailing}</View>}
      </View>
    )
  }

  return (
    <View className={`w-full rounded-3xl overflow-hidden ${className ?? ""}`}>
      <ImageBackground source={{ uri: headerImageUrl }} resizeMode='cover'>
        <View className='absolute inset-0 bg-black/40' />
        {identity}
        {trailing && <View className='absolute top-2 right-2'>{trailing}</View>}
      </ImageBackground>
    </View>
  )
}

export default ProfileHero
