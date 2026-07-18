import React from "react"
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"

// Small line-art companions to SignInHero's full-color bottle — muted/outline
// treatment so they read as calm placeholders inline in a list, not a second
// hero moment. Both share the same 96x96 canvas so EmptyState can lay either
// out identically.

// "Your collection is empty" — an unfilled bottle waiting for its first entry.
export function EmptyCollectionIllustration({ size = 88 }: { size?: number }) {
  const { theme } = useTheme()
  const dark = theme === "dark"
  const stroke = getColor(dark ? "zinc-600" : "zinc-300")
  const tint = getColor(dark ? "emerald-500" : "emerald-400")

  return (
    <Svg width={size} height={size} viewBox='0 0 96 96'>
      <Defs>
        <LinearGradient id='empty-glass' x1='0' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor={tint} stopOpacity={dark ? 0.16 : 0.14} />
          <Stop offset='1' stopColor={tint} stopOpacity='0' />
        </LinearGradient>
      </Defs>
      {/* cap + neck */}
      <Rect x={40} y={14} width={16} height={12} rx={3} stroke={stroke} strokeWidth={2.5} fill='none' />
      <Rect x={44} y={26} width={8} height={8} stroke={stroke} strokeWidth={2.5} fill='none' />
      {/* bottle body, mostly empty */}
      <Rect
        x={26}
        y={34}
        width={44}
        height={54}
        rx={14}
        stroke={stroke}
        strokeWidth={2.5}
        fill='url(#empty-glass)'
      />
      {/* a faint fill line near the bottom — "almost nothing in here yet" */}
      <Path d='M28 80 h40' stroke={stroke} strokeWidth={2} strokeDasharray='1 5' strokeLinecap='round' />
    </Svg>
  )
}

// "No matches" / "No results found" — a bottle with a search ring passing it by.
export function NoResultsIllustration({ size = 88 }: { size?: number }) {
  const { theme } = useTheme()
  const dark = theme === "dark"
  const stroke = getColor(dark ? "zinc-600" : "zinc-300")
  const ring = getColor(dark ? "zinc-500" : "zinc-400")

  return (
    <Svg width={size} height={size} viewBox='0 0 96 96'>
      {/* bottle, de-emphasized */}
      <Rect x={34} y={20} width={12} height={10} rx={2.5} stroke={stroke} strokeWidth={2.5} fill='none' />
      <Rect
        x={22}
        y={30}
        width={36}
        height={46}
        rx={12}
        stroke={stroke}
        strokeWidth={2.5}
        fill='none'
        opacity={0.6}
      />
      {/* search glass, overlapping top-right */}
      <Circle cx={64} cy={46} r={16} stroke={ring} strokeWidth={3.5} fill='none' />
      <Path d='M75 57 L86 68' stroke={ring} strokeWidth={4} strokeLinecap='round' />
    </Svg>
  )
}
