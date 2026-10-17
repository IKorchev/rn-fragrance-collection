// The design system's single source of truth: every color decision in the app
// resolves to a role defined here, per theme. theme-context.tsx is a thin
// adapter that reshapes these into the groups components already consume — it
// holds no color literals of its own.
//
// Two representations exist for most roles because the app needs both:
//   `token` — a bare Tailwind step ("zinc-900") for getColor() in RN style
//             objects and icon `color` props, which can't take classNames.
//   `text`/`bg`/`border` — complete literal classNames. These MUST stay
//             verbatim strings: NativeWind's scanner reads source text, so a
//             runtime-built `text-${role}` produces no CSS. Only the class
//             forms a role is actually used in are declared.

import { getColor } from "@/lib/utils/colors"

export type Theme = "light" | "dark"

// Each role declares only the representations it's actually used in, so a
// consumer can't reach for a class form that was never authored as a literal.
interface TextRole {
  token: string
  text: string
}

interface LineRole {
  token: string
  border: string
}

interface DangerRole {
  token: string
  text: string
  bg: string
}

interface IconRole {
  token: string
}

// Named surfaces the app stacks: page behind everything, card/modal on top of
// it, header/tab chrome at the edges. `font` is the default ink for content on
// that surface.
interface SurfaceRole {
  font: string
  background: string
}

// Labeled action pills (Wear / Add on list rows, Wear on the picker scrim).
// tint* sits on themed card rows; solid* sits on imagery (the picker's dark
// scrim, where a tint alone gets lost); worn* is the done-for-today state.
interface PillRole {
  tintBg: string
  tintText: string
  solidBg: string
  solidText: string
  wornBg: string
  wornText: string
  wornOverlayBg: string
  wornOverlayText: string
}

interface ThemeTokens {
  // Content
  ink: TextRole
  inkMuted: TextRole
  // The palette is deliberately hueless (iOS-native: greys plus ink) — color
  // comes from the bottle photos. Accent and highlight are both ink; they stay
  // separate roles so a hue can return to either without touching consumers.
  // Action emphasis — buttons, links, stat values
  accent: TextRole
  // Selection/navigation — active tabs, selected chips
  highlight: IconRole
  // Destructive
  danger: DangerRole
  // Hairlines and card borders
  line: LineRole
  // Surfaces
  page: SurfaceRole
  card: SurfaceRole
  modal: SurfaceRole
  header: SurfaceRole
  // Filled primary button background, and the ink that sits on it (white on
  // the light theme's black button, black on the dark theme's white one)
  primaryBg: string
  onPrimary: TextRole
  // Tinted backgrounds are raw color strings, not classNames, because they're
  // consumed via style={{ backgroundColor }} — so they're exempt from the
  // literal-scanner rule above and can use rgba for alpha.
  accentTintBg: string
  highlightTintBg: string
  // On-state Switch track. Not ink in dark mode: a near-white track under the
  // white thumb would hide the thumb.
  switchTrack: string
  // NativeTabs' backgroundColor prop takes a ColorValue, not a className.
  // Matches header.background so the Android tab bar isn't stuck light.
  tabBarBackground: string
  pill: PillRole
}

export const tokens: Record<Theme, ThemeTokens> = {
  light: {
    ink: { token: "zinc-900", text: "text-zinc-900" },
    inkMuted: { token: "zinc-500", text: "text-zinc-500" },
    accent: { token: "zinc-900", text: "text-zinc-900" },
    highlight: { token: "zinc-900" },
    danger: { token: "red-600", text: "text-red-600", bg: "bg-red-500/10" },
    line: { token: "zinc-200", border: "border-zinc-200" },

    page: { font: "text-zinc-900", background: "bg-zinc-100" },
    card: { font: "text-zinc-900", background: "bg-white" },
    modal: { font: "text-zinc-900", background: "bg-zinc-100" },
    header: { font: "text-zinc-900", background: "bg-zinc-100" },

    primaryBg: "bg-zinc-900",
    onPrimary: { token: "white", text: "text-white" },
    accentTintBg: "rgba(0, 0, 0, 0.06)",
    highlightTintBg: "rgba(0, 0, 0, 0.06)",
    switchTrack: getColor("zinc-900"),
    tabBarBackground: getColor("zinc-100"),

    pill: {
      tintBg: "bg-zinc-100",
      tintText: "text-zinc-900",
      solidBg: "bg-white",
      solidText: "text-zinc-900",
      wornBg: "bg-zinc-100",
      wornText: "text-zinc-400",
      wornOverlayBg: "bg-white/15",
      wornOverlayText: "text-white/70",
    },
  },

  dark: {
    ink: { token: "zinc-100", text: "text-zinc-100" },
    inkMuted: { token: "zinc-400", text: "text-zinc-400" },
    accent: { token: "zinc-100", text: "text-zinc-100" },
    highlight: { token: "zinc-100" },
    danger: { token: "red-400", text: "text-red-400", bg: "bg-red-500/20" },
    line: { token: "zinc-800", border: "border-zinc-800" },

    page: { font: "text-zinc-100", background: "bg-black" },
    card: { font: "text-zinc-100", background: "bg-zinc-900" },
    modal: { font: "text-zinc-100", background: "bg-black" },
    header: { font: "text-zinc-100", background: "bg-black" },

    primaryBg: "bg-zinc-100",
    onPrimary: { token: "zinc-900", text: "text-zinc-900" },
    accentTintBg: "rgba(255, 255, 255, 0.12)",
    highlightTintBg: "rgba(255, 255, 255, 0.12)",
    switchTrack: getColor("zinc-500"),
    tabBarBackground: "black",

    pill: {
      tintBg: "bg-zinc-800",
      tintText: "text-zinc-100",
      solidBg: "bg-white",
      solidText: "text-zinc-900",
      wornBg: "bg-zinc-800",
      wornText: "text-zinc-500",
      wornOverlayBg: "bg-white/15",
      wornOverlayText: "text-white/70",
    },
  },
}

// Shape scale. Rounding carries meaning here: pills for actions, 2xl for
// cards/sheets, xl for inset thumbnails, lg for compact chips.
export const radius = {
  pill: "rounded-full",
  card: "rounded-2xl",
  tile: "rounded-xl",
  chip: "rounded-lg",
} as const

// Type scale. Everything is the system face — `display` is the screen-header size.
export const typography = {
  display: "text-2xl font-bold",
  title: "text-base font-semibold",
  body: "text-base",
  label: "text-sm font-semibold",
  meta: "text-xs",
  sectionHeading: "text-xs font-semibold uppercase tracking-wider",
} as const
