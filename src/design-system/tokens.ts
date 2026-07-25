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
  // Brand/action color — buttons, active pills, positive emphasis
  accent: TextRole
  // Warm "you are here" color for selection/navigation (active tabs, selected
  // chips). Deliberately NOT accent: emerald means "act", amber means "here".
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
  // Filled primary button background
  primaryBg: string
  // Tinted backgrounds are raw color strings, not classNames, because they're
  // consumed via style={{ backgroundColor }} — so they're exempt from the
  // literal-scanner rule above and can use rgba for alpha.
  accentTintBg: string
  highlightTintBg: string
  // NativeTabs' backgroundColor prop takes a ColorValue, not a className.
  // Matches header.background so the Android tab bar isn't stuck light.
  tabBarBackground: string
  pill: PillRole
}

export const tokens: Record<Theme, ThemeTokens> = {
  light: {
    ink: { token: "zinc-900", text: "text-zinc-900" },
    inkMuted: { token: "zinc-500", text: "text-zinc-500" },
    accent: { token: "emerald-600", text: "text-emerald-600" },
    highlight: { token: "amber-600" },
    danger: { token: "rose-600", text: "text-rose-600", bg: "bg-rose-500/10" },
    line: { token: "zinc-200", border: "border-zinc-200" },

    page: { font: "text-zinc-900", background: "bg-zinc-50" },
    card: { font: "text-zinc-900", background: "bg-white" },
    modal: { font: "text-zinc-900", background: "bg-white" },
    header: { font: "text-zinc-900", background: "bg-white" },

    primaryBg: "bg-emerald-600",
    accentTintBg: getColor("emerald-50"),
    highlightTintBg: getColor("amber-50"),
    tabBarBackground: "white",

    pill: {
      tintBg: "bg-emerald-600/10",
      tintText: "text-emerald-700",
      solidBg: "bg-emerald-600",
      solidText: "text-white",
      wornBg: "bg-zinc-100",
      wornText: "text-zinc-500",
      wornOverlayBg: "bg-white/15",
      wornOverlayText: "text-white/70",
    },
  },

  dark: {
    ink: { token: "zinc-100", text: "text-zinc-100" },
    inkMuted: { token: "zinc-400", text: "text-zinc-400" },
    accent: { token: "emerald-400", text: "text-emerald-400" },
    highlight: { token: "amber-400" },
    danger: { token: "rose-400", text: "text-rose-400", bg: "bg-rose-500/20" },
    line: { token: "zinc-800", border: "border-zinc-800" },

    page: { font: "text-zinc-100", background: "bg-zinc-950" },
    card: { font: "text-zinc-100", background: "bg-zinc-900" },
    modal: { font: "text-zinc-100", background: "bg-zinc-900" },
    header: { font: "text-zinc-100", background: "bg-zinc-950" },

    primaryBg: "bg-emerald-500",
    accentTintBg: "rgba(52, 211, 153, 0.15)",
    highlightTintBg: "rgba(251, 191, 36, 0.15)",
    tabBarBackground: getColor("zinc-950"),

    pill: {
      tintBg: "bg-emerald-400/15",
      tintText: "text-emerald-400",
      solidBg: "bg-emerald-500",
      solidText: "text-white",
      wornBg: "bg-zinc-800",
      wornText: "text-zinc-400",
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

// Type scale. `display` is Fraunces (loaded in _layout.tsx, mapped in
// tailwind.config.js) and is reserved for screen headers — everything else is
// the system face.
export const typography = {
  display: "font-display",
  title: "text-base font-semibold",
  body: "text-base",
  label: "text-sm font-semibold",
  meta: "text-xs",
  sectionHeading: "text-xs font-semibold uppercase tracking-wider",
} as const
