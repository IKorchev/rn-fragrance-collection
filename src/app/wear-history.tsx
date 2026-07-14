import React, { useMemo } from "react"
import { SectionList, Text, View } from "react-native"
import { useRouter } from "expo-router"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import { useWearHistory, type WearEvent } from "@/lib/queries"
import Card from "@/components/card"

interface DaySection {
  title: string
  data: WearEvent[]
}

const dayTitle = (date: Date, today: Date) => {
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" as const } : {}),
  }).format(date)
}

// Events arrive newest-first from useWearHistory, so grouping by calendar day
// (device-local, same day semantics as the once-per-day wear cap) preserves order.
const groupByDay = (events: WearEvent[]): DaySection[] => {
  const today = new Date()
  const sections: DaySection[] = []
  let currentKey: string | null = null

  for (const event of events) {
    const date = new Date(event.worn_at)
    const key = date.toDateString()
    if (key !== currentKey) {
      currentKey = key
      sections.push({ title: dayTitle(date, today), data: [] })
    }
    sections[sections.length - 1].data.push(event)
  }
  return sections
}

const WearHistoryScreen = () => {
  const router = useRouter()
  const { modalColors, mutedTextClass } = useTheme()
  const { user } = useAuth()
  const { data: events, isPending, error } = useWearHistory(user?.id)

  const sections = useMemo(() => groupByDay(events ?? []), [events])

  const emptyMessage = error
    ? "Couldn't load your wear history, please try again later."
    : isPending
      ? "Loading…"
      : "No wears logged yet — tap the spray button on a fragrance to start your diary."

  return (
    <View className={`flex-1 ${modalColors.background}`}>
      <SectionList
        sections={sections}
        keyExtractor={(event) => event.id}
        contentContainerClassName='pb-12 pt-2'
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text className={`${mutedTextClass} text-base text-center px-8 pt-10`}>
            {emptyMessage}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text className={`${mutedTextClass} text-sm font-semibold px-4 pt-5 pb-1`}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const brand = item.name.split(" - ")[0]
          const title = item.name.split(" - ").slice(1).join(" - ")

          return (
            <Card.Root
              onPress={() =>
                router.push({
                  pathname: "/fragrance-detail",
                  params: { name: item.name, imageUrl: item.image_url ?? "" },
                })
              }>
              <Card.Thumbnail imageUrl={item.image_url} />
              <Card.Content>
                <Card.Title>{title}</Card.Title>
                <Card.Subtitle>{brand}</Card.Subtitle>
              </Card.Content>
            </Card.Root>
          )
        }}
      />
    </View>
  )
}

export default WearHistoryScreen
