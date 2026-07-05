import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type Theme = "light" | "dark"

interface ColorGroup {
  font: string
  background: string
}

// Tinted action buttons: *Bg is a complete literal className, *Icon is a bare
// token for getColor(). Soft tint + strong icon reads better than filled circles.
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
  viewColors: ColorGroup
  headerColors: ColorGroup
  cardColors: ColorGroup
  modalColors: ColorGroup
  buttons: ButtonGroup
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
        wearBg: "bg-emerald-500/15",
        wearIcon: "emerald-400",
        editBg: "bg-sky-500/15",
        editIcon: "sky-400",
        deleteBg: "bg-rose-500/15",
        deleteIcon: "rose-400",
        rerollBg: "bg-amber-500/15",
        rerollIcon: "amber-400",
      }
    : {
        wearBg: "bg-emerald-100",
        wearIcon: "emerald-700",
        editBg: "bg-sky-100",
        editIcon: "sky-700",
        deleteBg: "bg-rose-100",
        deleteIcon: "rose-600",
        rerollBg: "bg-amber-100",
        rerollIcon: "amber-600",
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
        viewColors,
        headerColors,
        theme,
        cardColors,
        modalColors,
        buttons,
        setTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default useTheme
