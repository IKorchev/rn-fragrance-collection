import React, { useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"
import type { WearEvent } from "@/lib/queries"

const WEEKS = 16
const CELL = 13
const GAP = 3
// Sequential ramp: one hue (the app's own accent) at increasing opacity —
// not a second palette. Empty days get a neutral surface tint, not opacity 0,
// so the grid itself is visible even with no wears logged.
const LEVEL_OPACITIES = [0, 0.28, 0.52, 0.76, 1]

const withAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const levelForCount = (count: number) => {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

interface WearHeatmapProps {
  events: WearEvent[]
  className?: string
}

// GitHub-style activity grid — one column per week (oldest → newest, left →
// right), one row per weekday (Sun → Sat), built from the personal wear
// diary. Tap a day for its exact count (a hover tooltip doesn't translate to
// touch, so a tap-to-reveal caption is the mobile equivalent).
const WearHeatmap = ({ events, className }: WearHeatmapProps) => {
  const { theme, accentColors, baseBorderClass, mutedTextClass } = useTheme()
  const [selected, setSelected] = useState<{ date: Date; count: number } | null>(null)

  const countByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of events) {
      const key = new Date(event.worn_at).toDateString()
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [events])

  const columns = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentWeekStart = new Date(today)
    currentWeekStart.setDate(today.getDate() - today.getDay())
    const gridStart = new Date(currentWeekStart)
    gridStart.setDate(currentWeekStart.getDate() - (WEEKS - 1) * 7)

    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(gridStart)
        date.setDate(gridStart.getDate() + w * 7 + d)
        return date
      })
    )
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const baseHex = getColor(accentColors)
  const emptyColor = getColor(theme === "dark" ? "zinc-800" : "zinc-100")

  return (
    <View className={`w-full rounded-2xl border ${baseBorderClass} p-4 ${className ?? ""}`}>
      <Text className={`${mutedTextClass} text-xs font-semibold uppercase pb-4`}>
        Scent activity
      </Text>

      <View className='items-center'>
        <View className='flex-row' style={{ paddingTop: 13 }}>
          {columns.map((col, w) => {
            const monthLabel =
              w === 0 || col[0].getMonth() !== columns[w - 1][0].getMonth()
                ? col[0].toLocaleDateString("en", { month: "short" })
                : null
            return (
              <View key={w} style={{ width: CELL, marginRight: w === WEEKS - 1 ? 0 : GAP }}>
                {monthLabel && (
                  <Text
                    className={`${mutedTextClass} text-[9px]`}
                    style={{ position: "absolute", top: -13, left: 0 }}
                    numberOfLines={1}>
                    {monthLabel}
                  </Text>
                )}
                {col.map((date, d) => {
                  const isFuture = date > today
                  const count = countByDay.get(date.toDateString()) ?? 0
                  const level = levelForCount(count)
                  const bg = isFuture
                    ? "transparent"
                    : level === 0
                      ? emptyColor
                      : withAlpha(baseHex, LEVEL_OPACITIES[level])
                  return (
                    <Pressable
                      key={d}
                      disabled={isFuture}
                      hitSlop={2}
                      onPress={() => setSelected({ date, count })}
                      style={{
                        width: CELL,
                        height: CELL,
                        marginBottom: d === 6 ? 0 : GAP,
                        borderRadius: 3,
                        backgroundColor: bg,
                      }}
                    />
                  )
                })}
              </View>
            )
          })}
        </View>

        <View className='flex-row items-center pt-3' style={{ gap: 4 }}>
          <Text className={`${mutedTextClass} text-xs`}>Less</Text>
          {LEVEL_OPACITIES.map((opacity, i) => (
            <View
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: 3,
                backgroundColor: opacity === 0 ? emptyColor : withAlpha(baseHex, opacity),
              }}
            />
          ))}
          <Text className={`${mutedTextClass} text-xs`}>More</Text>
        </View>

        <Text className={`${mutedTextClass} text-xs pt-3`}>
          {selected
            ? `${selected.date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })} — ${selected.count} ${selected.count === 1 ? "entry" : "entries"}`
            : "Tap a day to see entries"}
        </Text>
      </View>
    </View>
  )
}

export default WearHeatmap
