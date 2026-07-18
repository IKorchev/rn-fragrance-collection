import React, { type ReactNode } from "react"
import { ListItem } from "@rneui/themed"
import { Image } from "expo-image"
import * as Haptics from "expo-haptics"
import { Text, View, type StyleProp, type ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { getImageSource } from "@/lib/utils/image-source"
import { formatRelativeDay } from "@/lib/utils/relative-time"
import IconButton from "@/components/shared/ui/icon-button"
import PressableScale from "@/components/shared/ui/pressable-scale"

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
    borderRadius: 16,
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
  const { theme, mutedColors } = useTheme()
  const medalColor =
    place === 1
      ? getColor(theme === "dark" ? "amber-400" : "amber-500")
      : place === 2
        ? getColor("zinc-400")
        : place === 3
          ? getColor("amber-700")
          : getColor(mutedColors)

  return (
    <View className='w-10 h-full justify-center items-center pl-2'>
      <Text
        className={`text-center font-bold ${place <= 3 ? "text-lg" : "text-base"}`}
        style={{ color: medalColor }}>
        {place}
      </Text>
    </View>
  )
}

// compact: a small rounded chip for inline rows (did-you-mean strip, closest-
// match preview) instead of the inset card thumbnail.
const Thumbnail = ({ imageUrl, compact }: { imageUrl?: string | null; compact?: boolean }) => {
  const { theme, mutedColors } = useTheme()
  const imageSource = getImageSource(imageUrl)
  const placeholderBg = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"

  if (!imageSource) {
    return (
      <View
        className={
          compact
            ? `h-9 w-9 rounded-lg items-center justify-center mr-3 ${placeholderBg}`
            : `ml-3 h-14 w-14 rounded-xl items-center justify-center ${placeholderBg}`
        }>
        <MaterialCommunityIcons name='image-off' size={compact ? 16 : 22} color={getColor(mutedColors)} />
      </View>
    )
  }

  if (compact) {
    return (
      <Image
        source={imageSource}
        style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }}
        contentFit='cover'
        transition={150}
      />
    )
  }

  return (
    // Inset rounded tile; white backing keeps product shots (white
    // backgrounds) from clashing in dark mode without a full-height slab
    <View className='ml-3 h-14 w-14 items-center justify-center rounded-xl bg-white overflow-hidden'>
      <Image style={{ height: 48, width: 48 }} contentFit='contain' transition={150} source={imageSource} />
    </View>
  )
}

const Content = ({ children }: { children: ReactNode }) => (
  <ListItem.Content style={{ padding: 0, paddingLeft: 12 }}>{children}</ListItem.Content>
)

// Dark scrim pinned to the bottom of an image (the picker reel) so the
// overlay-variant text sections below stay readable on any product shot.
// Right padding leaves room for the wear ActionPill overlaid on the window.
const Overlay = ({ children }: { children: ReactNode }) => (
  <View className='absolute inset-x-0 bottom-0 justify-center bg-black/60 py-3 pl-4 pr-24 min-h-[68px]'>
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
  overlay,
  community,
  avgRating,
  ratingCount,
}: {
  timesWorn: number
  lastWorn?: string | null
  centered?: boolean
  // Fixed white-on-scrim styling for use inside Card.Overlay
  overlay?: boolean
  // Community rows (leaderboard/search): "1,234 wears" phrasing, and the wear
  // part is omitted entirely at 0 (catalog rows aren't "not worn yet")
  community?: boolean
  avgRating?: number | null
  ratingCount?: number | null
}) => {
  const { mutedTextClass } = useTheme()

  const parts: string[] = []
  if (community) {
    if (timesWorn > 0) parts.push(`${timesWorn.toLocaleString()} ${timesWorn === 1 ? "wear" : "wears"}`)
  } else {
    parts.push(timesWorn > 0 ? `Worn ${timesWorn}×` : "Not worn yet")
    if (lastWorn) parts.push(formatRelativeDay(lastWorn))
  }
  if (avgRating != null && ratingCount) parts.push(`★ ${avgRating.toFixed(1)} (${ratingCount})`)

  if (parts.length === 0) return null

  return (
    <Text
      numberOfLines={1}
      className={`text-xs pt-0.5 ${overlay ? "text-white/80" : mutedTextClass} ${centered ? "text-center" : ""}`}>
      {parts.join("  ·  ")}
    </Text>
  )
}

type ActionVariant = "delete"

interface ActionButtonProps {
  variant: ActionVariant
  onPress: () => void
  className?: string
  style?: StyleProp<ViewStyle>
  // Icon-only button — testID is the only way Maestro flows can target it
  testID?: string
  // Render prop so the tinted icon color stays paired with the variant's background
  children: (iconColor: string) => ReactNode
}

// Icon-only circular action — now just the swipe-reveal delete; the everyday
// wear/add actions are labeled ActionPills instead.
const ActionButton = ({ variant, onPress, className, style, testID, children }: ActionButtonProps) => {
  const { buttons } = useTheme()
  const bgByVariant: Record<ActionVariant, string> = { delete: buttons.deleteBg }
  const iconByVariant: Record<ActionVariant, string> = { delete: buttons.deleteIcon }

  return (
    <IconButton
      bgClassName={bgByVariant[variant]}
      className={className}
      style={style}
      testID={testID}
      onPress={onPress}>
      {children(getColor(iconByVariant[variant]))}
    </IconButton>
  )
}

interface ActionPillProps {
  label: string
  onPress: () => void
  // Worn-today state: muted bg + check icon. Still tappable on purpose — the
  // increment_wear round-trip surfaces the "already worn" toast.
  worn?: boolean
  // "tint" on themed rows; "solid" over imagery (the picker's dark scrim,
  // where a tint alone gets lost)
  appearance?: "tint" | "solid"
  size?: "md" | "lg"
  disabled?: boolean
  className?: string
  // For what className can't express (e.g. shadow when floating over an image)
  style?: StyleProp<ViewStyle>
  testID?: string
}

// Labeled action pill — "Wear" / "Add" on list rows and the picker window.
const ActionPill = ({
  label,
  onPress,
  worn,
  appearance = "tint",
  size = "md",
  disabled,
  className,
  style,
  testID,
}: ActionPillProps) => {
  const { pill } = useTheme()

  const bgClass = worn
    ? appearance === "solid"
      ? pill.wornOverlayBg
      : pill.wornBg
    : appearance === "solid"
      ? pill.solidBg
      : pill.tintBg
  const textClass = worn
    ? appearance === "solid"
      ? pill.wornOverlayText
      : pill.wornText
    : appearance === "solid"
      ? pill.solidText
      : pill.tintText
  const sizeClass = size === "lg" ? "h-10 px-5" : "h-9 px-4"

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      className={`${bgClass} ${sizeClass} flex-row items-center justify-center rounded-full ${disabled ? "opacity-40" : ""} ${className ?? ""}`}
      style={style}
      testID={testID}>
      {worn && (
        <MaterialCommunityIcons
          name='check'
          size={15}
          // Both worn text classes are literal "text-…" tokens; strip the
          // prefix (and any /opacity suffix) for the icon color prop
          color={getColor(textClass.replace("text-", "").split("/")[0])}
          style={{ marginRight: 4 }}
        />
      )}
      <Text className={`${textClass} font-semibold ${size === "lg" ? "text-base" : "text-sm"}`}>
        {worn ? "Worn" : label}
      </Text>
    </PressableScale>
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
  ActionPill,
}

export default Card
