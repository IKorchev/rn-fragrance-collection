import React, { type ReactNode } from "react"
import { ListItem } from "@rneui/themed"
import { Image } from "expo-image"
import {
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { getImageSource } from "@/lib/utils/image-source"

interface RootProps {
  onPress?: () => void
  // Actions revealed behind a left swipe (renders ListItem.Swipeable); omit for a plain row
  swipeActions?: ReactNode
  children: ReactNode
}

const Root = ({ onPress, swipeActions, children }: RootProps) => {
  const { theme, cardColors, cardBorderColors } = useTheme()

  const containerStyle = {
    backgroundColor: getColor(cardColors.background.replace("bg-", "")),
    borderWidth: 1,
    borderColor: getColor(cardBorderColors),
    borderRadius: 14,
    marginVertical: 4,
    marginHorizontal: 12,
    padding: 0,
    height: 84,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOpacity: theme === "light" ? 0.06 : 0,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: theme === "light" ? 2 : 0,
  }

  if (swipeActions) {
    return (
      <ListItem.Swipeable
        onPress={onPress}
        rightWidth={54}
        // No leftContent, but leftWidth still defaults to ScreenWidth/3 — a
        // rightward release while the row is open would snap the card that far
        // off-screen and leave it there. 0 makes every right swipe settle closed.
        leftWidth={0}
        // Default minSlideWidth is ScreenWidth/3 (~130px) — far past the 54px
        // button, which made the swipe feel like it needed too much force
        minSlideWidth={40}
        rightContent={() => (
          <View className='flex-1 flex-row items-center justify-end pr-4' style={{ gap: 10 }}>
            {swipeActions}
          </View>
        )}
        containerStyle={containerStyle}>
        {children}
      </ListItem.Swipeable>
    )
  }

  return (
    <ListItem onPress={onPress} containerStyle={containerStyle}>
      {children}
    </ListItem>
  )
}

const Rank = ({ place }: { place: number }) => {
  const { mutedTextClass } = useTheme()

  return (
    <View className='w-10 h-full justify-center items-center'>
      <Text className={`${mutedTextClass} text-base font-bold text-center`}>{place}</Text>
    </View>
  )
}

const Thumbnail = ({ imageUrl }: { imageUrl?: string | null }) => {
  const { mutedColors } = useTheme()
  const imageSource = getImageSource(imageUrl)

  if (!imageSource) {
    return (
      <View className='h-[84px] w-20 items-center justify-center'>
        <MaterialCommunityIcons name='image-off' size={24} color={getColor(mutedColors)} />
      </View>
    )
  }

  return (
    // White backing keeps product shots (white backgrounds) from clashing in dark mode
    <View className='h-[84px] w-20 items-center justify-center bg-white'>
      {/* expo-image: disk-cached CDN thumbnails + a soft fade-in */}
      <Image style={{ height: 64, width: 64 }} contentFit='contain' transition={150} source={imageSource} />
    </View>
  )
}

const Content = ({ children }: { children: ReactNode }) => (
  <ListItem.Content style={{ padding: 0, paddingLeft: 12 }}>{children}</ListItem.Content>
)

// Dark scrim pinned to the bottom of an image (the picker reel) so the
// overlay-variant text sections below stay readable on any product shot.
// Right padding leaves room for an ActionButton overlaid on the window.
const Overlay = ({ children }: { children: ReactNode }) => (
  <View className='absolute inset-x-0 bottom-0 justify-center bg-black/60 py-3 pl-4 pr-16 min-h-[68px]'>
    {children}
  </View>
)
const Title = ({ children, color, centered }: { children: ReactNode; color?: string; centered?: boolean }) => {
  const { baseColors } = useTheme()

  return (
    <ListItem.Title style={{ color: color || getColor(baseColors), fontWeight: "600", textAlign: centered ? "center" : "left" }} numberOfLines={1}>
      {children}
    </ListItem.Title>
  )
}

const Subtitle = ({ children, color, centered }: { children: ReactNode; color?: string, centered?: boolean }) => {
  const { mutedColors } = useTheme()

  return (
    <ListItem.Subtitle style={{ color: color || getColor(mutedColors), fontSize: 13, paddingTop: 2, textAlign: centered ? "center" : "left" }}>
      {children}
    </ListItem.Subtitle>
  )
}


const WearInfoText = ({
  timesWorn,
  lastWorn,
  centered,
  color,
  avgRating,
  ratingCount,
}: {
  timesWorn: number
  lastWorn?: string | null
  centered?: boolean
  color?: string
  // Community rating — appended inline so this stays within the card's fixed row height
  avgRating?: number | null
  ratingCount?: number | null
}) => {
  const { mutedColors } = useTheme()
  const lastWornFormatted = lastWorn ? Intl.DateTimeFormat("en", {
    dateStyle: 'long'
  }).format(new Date(lastWorn)) : null

  return (
    <>
      <Text className={`text-xs ${`text-${color || mutedColors}`} ${centered ? "text-center" : ""}`}>
        Times worn: <Text className='font-bold'>{timesWorn}</Text>
        {avgRating != null && ratingCount ? (
          <Text className='font-bold'>{`  ·  ★ ${avgRating.toFixed(1)} (${ratingCount})`}</Text>
        ) : null}
      </Text>
      {lastWorn && (
        <Text className={`text-xs ${`text-${color || mutedColors}`} ${centered ? "text-center" : ""}`}>
          Last worn: <Text className='font-bold'>{lastWornFormatted}</Text>
        </Text>
      )}
    </>
  )
}

type ActionVariant = "wear" | "edit" | "delete" | "reroll"

interface ActionButtonProps {
  variant: ActionVariant
  onPress: () => void
  dimmed?: boolean
  // "md" for list rows, "lg" for the picker's overlaid wear button
  size?: "md" | "lg"
  className?: string
  // For what className can't express (e.g. shadow when floating over an image)
  style?: StyleProp<ViewStyle>
  // Icon-only button — testID is the only way Maestro flows can target it
  testID?: string
  // Render prop so the tinted icon color stays paired with the variant's background
  children: (iconColor: string) => ReactNode
}

const ActionButton = ({
  variant,
  onPress,
  dimmed,
  size = "md",
  className,
  style,
  testID,
  children,
}: ActionButtonProps) => {
  const { buttons } = useTheme()
  const bgByVariant: Record<ActionVariant, string> = {
    wear: buttons.wearBg,
    edit: buttons.editBg,
    delete: buttons.deleteBg,
    reroll: buttons.rerollBg,
  }
  const iconByVariant: Record<ActionVariant, string> = {
    wear: buttons.wearIcon,
    edit: buttons.editIcon,
    delete: buttons.deleteIcon,
    reroll: buttons.rerollIcon,
  }

  return (
    <TouchableOpacity
      className={`${bgByVariant[variant]} ${size === "lg" ? "h-12 w-12" : "h-11 w-11"} justify-center rounded-full items-center ${dimmed ? "opacity-40" : ""} ${className ?? ""}`}
      style={style}
      testID={testID}
      onPress={onPress}>
      {children(getColor(iconByVariant[variant]))}
    </TouchableOpacity>
  )
}

const Card = {
  Root,
  Rank,
  Thumbnail,
  Content,
  Overlay,
  Title,
  Subtitle,
  WearInfoText,
  ActionButton,
}

export default Card
