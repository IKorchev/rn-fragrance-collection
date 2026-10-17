import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { tokens, type Theme } from "@/design-system/tokens"

export type { Theme }
// What's actually stored/selected — "system" resolves to the OS scheme at
// render time and stays live if the OS scheme changes underneath it.
export type ThemePreference = Theme | "system"

interface ColorGroup {
  font: string
  background: string
}

// Tinted action buttons: *Bg is a complete literal className group, *Icon is
// a bare token for getColor(). Only delete survives as an icon button (swipe
// reveal) — wear/add are labeled pills (see PillGroup).
interface ButtonGroup {
  deleteBg: string
  deleteIcon: string
}

// Labeled action pills (Wear / Add on list rows, Wear on the picker scrim).
// tint* sits on themed card rows; solid* sits on imagery (the picker's dark
// scrim, where a tint alone gets lost); worn* is the done-for-today state.
interface PillGroup {
  tintBg: string
  tintText: string
  solidBg: string
  solidText: string
  wornBg: string
  wornText: string
  wornOverlayBg: string
  wornOverlayText: string
}

// shared/ui's danger-toned components (Button variant="danger", Row, etc.) —
// bgClass/color mirror buttons.deleteBg/deleteIcon (same rose tint) rather
// than restating the literal a second time; textClass is the one new value.
interface DangerGroup {
  textClass: string
  bgClass: string
  color: string
}

interface ThemeContextValue {
  // Bare color tokens — for getColor() in RN style objects / icon color props
  baseColors: string
  mutedColors: string
  accentColors: string
  cardBorderColors: string
  // Complete literal classNames — NativeWind's scanner needs these verbatim
  baseTextClass: string
  mutedTextClass: string
  accentTextClass: string
  baseBorderClass: string
  // Button's filled/primary background — complete literal — plus the text
  // class and bare token for content on top of it
  primaryBg: string
  onPrimaryTextClass: string
  onPrimaryColors: string
  // Selected-chip / tinted-badge background — a bare rgba/hex string for
  // style={{backgroundColor}}, not a className, so it's exempt from the
  // literal-scanner constraint above
  accentTintBg: string
  // Selection/navigation states (active tabs, selected filter chips). Bare
  // token + tint background, mirroring accentColors/accentTintBg; all
  // consumers are style objects, so no literal classNames needed.
  highlightColors: string
  highlightTintBg: string
  // Switch trackColor.true — a resolved color string
  switchTrackColor: string
  // NativeTabs' backgroundColor prop takes a ColorValue, not a className —
  // matches headerColors.background so the bottom bar isn't stuck light on
  // Android (NativeTabs doesn't follow in-app theme automatically there)
  tabBarBackgroundColor: string
  viewColors: ColorGroup
  headerColors: ColorGroup
  cardColors: ColorGroup
  modalColors: ColorGroup
  buttons: ButtonGroup
  pill: PillGroup
  danger: DangerGroup
  // Resolved value — everything except the Profile appearance picker should
  // read this, never themePreference (it's the source of truth for styling).
  theme: Theme
  themePreference: ThemePreference
  setThemePreference: React.Dispatch<React.SetStateAction<ThemePreference>>
}

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue)
// Exported so Storybook's decorator can seed a theme without restating the key
export const THEME_STORAGE_KEY = "theme"

const useTheme = () => {
  return useContext(ThemeContext)
}

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme()
  const [themePreference, setThemePreference] = useState<ThemePreference>("light")

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setThemePreference(stored)
    })
  }, [])

  useEffect(() => {
    AsyncStorage.setItem(THEME_STORAGE_KEY, themePreference)
  }, [themePreference])

  const theme: Theme =
    themePreference === "system" ? (systemScheme === "dark" ? "dark" : "light") : themePreference

  // Everything below is a rename of the active theme's design tokens into the
  // shape components already consume — no color decisions live here.
  const t = tokens[theme]

  const baseColors = t.ink.token
  const mutedColors = t.inkMuted.token
  const accentColors = t.accent.token
  const cardBorderColors = t.line.token

  const baseTextClass = t.ink.text
  const mutedTextClass = t.inkMuted.text
  const accentTextClass = t.accent.text
  const baseBorderClass = t.line.border

  const headerColors = t.header
  const modalColors = t.modal
  const viewColors = t.page
  const cardColors = t.card

  const buttons: ButtonGroup = {
    deleteBg: t.danger.bg,
    deleteIcon: t.danger.token,
  }

  const pill: PillGroup = t.pill

  const primaryBg = t.primaryBg
  const onPrimaryTextClass = t.onPrimary.text
  const onPrimaryColors = t.onPrimary.token
  const accentTintBg = t.accentTintBg
  const highlightColors = t.highlight.token
  const highlightTintBg = t.highlightTintBg
  const switchTrackColor = t.switchTrack
  const tabBarBackgroundColor = t.tabBarBackground
  const danger: DangerGroup = {
    textClass: t.danger.text,
    bgClass: t.danger.bg,
    color: t.danger.token,
  }

  return (
    <ThemeContext.Provider
      value={{
        baseColors,
        mutedColors,
        accentColors,
        cardBorderColors,
        baseTextClass,
        mutedTextClass,
        accentTextClass,
        baseBorderClass,
        primaryBg,
        onPrimaryTextClass,
        onPrimaryColors,
        accentTintBg,
        highlightColors,
        highlightTintBg,
        switchTrackColor,
        tabBarBackgroundColor,
        viewColors,
        headerColors,
        theme,
        cardColors,
        modalColors,
        buttons,
        pill,
        danger,
        themePreference,
        setThemePreference,
      }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default useTheme
