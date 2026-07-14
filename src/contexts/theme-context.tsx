import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getColor } from "@/lib/utils/colors"

export type Theme = "light" | "dark"

interface ColorGroup {
  font: string
  background: string
}

// Tinted action buttons: *Bg is a complete literal className group (tint +
// outline), *Icon is a bare token for getColor(). The colored outline is what
// makes the button read as a button — the tint alone got lost on busy
// backgrounds (especially the picker's dark scrim).
interface ButtonGroup {
  wearBg: string
  wearIcon: string
  editBg: string
  editIcon: string
  deleteBg: string
  deleteIcon: string
  rerollBg: string
  rerollIcon: string
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
  danger: DangerGroup
  theme: Theme
  setTheme: React.Dispatch<React.SetStateAction<Theme>>
}

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue)
const THEME_STORAGE_KEY = "theme"

const useTheme = () => {
  return useContext(ThemeContext)
}

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") setTheme(stored)
    })
  }, [])

  useEffect(() => {
    AsyncStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

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
        wearBg: "bg-emerald-500/25 border border-emerald-400/50",
        wearIcon: "emerald-400",
        editBg: "bg-sky-500/25 border border-sky-400/50",
        editIcon: "sky-400",
        deleteBg: "bg-rose-500/25 border border-rose-400/50",
        deleteIcon: "rose-400",
        rerollBg: "bg-amber-500/25 border border-amber-400/50",
        rerollIcon: "amber-400",
      }
    : {
        wearBg: "bg-emerald-200/70 border border-emerald-400/60",
        wearIcon: "emerald-700",
        editBg: "bg-sky-200/70 border border-sky-400/60",
        editIcon: "sky-700",
        deleteBg: "bg-rose-200/70 border border-rose-400/60",
        deleteIcon: "rose-600",
        rerollBg: "bg-amber-200/70 border border-amber-400/60",
        rerollIcon: "amber-600",
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
        danger,
        setTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default useTheme
