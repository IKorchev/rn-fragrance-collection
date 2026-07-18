import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getColor } from "@/lib/utils/colors"

export type Theme = "light" | "dark"
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
  // Button's filled/primary background — complete literal
  primaryBg: string
  // Selected-chip / tinted-badge background — a bare rgba/hex string for
  // style={{backgroundColor}}, not a className, so it's exempt from the
  // literal-scanner constraint above
  accentTintBg: string
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
const THEME_STORAGE_KEY = "theme"

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
  const dark = theme === "dark"

  const baseColors = dark ? "zinc-100" : "zinc-900"
  const mutedColors = dark ? "zinc-400" : "zinc-500"
  const accentColors = dark ? "emerald-400" : "emerald-600"
  const cardBorderColors = dark ? "zinc-800" : "zinc-200"

  const baseTextClass = dark ? "text-zinc-100" : "text-zinc-900"
  const mutedTextClass = dark ? "text-zinc-400" : "text-zinc-500"
  const accentTextClass = dark ? "text-emerald-400" : "text-emerald-600"
  const baseBorderClass = dark ? "border-zinc-800" : "border-zinc-200"

  const headerColors = {
    font: dark ? "text-zinc-100" : "text-zinc-900",
    background: dark ? "bg-zinc-950" : "bg-white",
  }
  const modalColors = {
    font: dark ? "text-zinc-100" : "text-zinc-900",
    background: dark ? "bg-zinc-900" : "bg-white",
  }
  const viewColors = {
    font: dark ? "text-zinc-100" : "text-zinc-900",
    background: dark ? "bg-zinc-950" : "bg-zinc-50",
  }
  const cardColors = {
    font: dark ? "text-zinc-100" : "text-zinc-900",
    background: dark ? "bg-zinc-900" : "bg-white",
  }

  const buttons = dark
    ? {
        deleteBg: "bg-rose-500/20",
        deleteIcon: "rose-400",
      }
    : {
        deleteBg: "bg-rose-500/10",
        deleteIcon: "rose-600",
      }

  const pill: PillGroup = dark
    ? {
        tintBg: "bg-emerald-400/15",
        tintText: "text-emerald-400",
        solidBg: "bg-emerald-500",
        solidText: "text-white",
        wornBg: "bg-zinc-800",
        wornText: "text-zinc-400",
        wornOverlayBg: "bg-white/15",
        wornOverlayText: "text-white/70",
      }
    : {
        tintBg: "bg-emerald-600/10",
        tintText: "text-emerald-700",
        solidBg: "bg-emerald-600",
        solidText: "text-white",
        wornBg: "bg-zinc-100",
        wornText: "text-zinc-500",
        wornOverlayBg: "bg-white/15",
        wornOverlayText: "text-white/70",
      }

  const primaryBg = dark ? "bg-emerald-500" : "bg-emerald-600"
  const accentTintBg = dark ? "rgba(52, 211, 153, 0.15)" : getColor("emerald-50")
  const tabBarBackgroundColor = dark ? getColor("zinc-950") : "white"
  const danger: DangerGroup = {
    textClass: dark ? "text-rose-400" : "text-rose-600",
    bgClass: buttons.deleteBg,
    color: buttons.deleteIcon,
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
        accentTintBg,
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
