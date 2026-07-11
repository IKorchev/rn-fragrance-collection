import React from "react"
import { useWindowDimensions } from "react-native"
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"

// Hand-drawn atomizer bottle in the app's emerald/zinc palette — the sign-in
// screen's hero mark. Pure SVG so it stays crisp at any size and re-tints
// with the theme (unlike the rasterized tab icon, this renders pre-auth where
// arbitrary components are allowed).
export function SignInHero({ size = 150 }: { size?: number }) {
  const { theme } = useTheme()
  const dark = theme === "dark"

  const glassTop = getColor(dark ? "emerald-400" : "emerald-500")
  const glassBottom = getColor(dark ? "emerald-600" : "emerald-700")
  const metalLight = getColor(dark ? "zinc-300" : "zinc-400")
  const metalDark = getColor(dark ? "zinc-500" : "zinc-600")
  const mist = getColor(dark ? "emerald-300" : "emerald-500")

  return (
    <Svg width={size * 0.8} height={size} viewBox='0 0 160 200'>
      <Defs>
        <LinearGradient id='glass' x1='0' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor={glassTop} />
          <Stop offset='1' stopColor={glassBottom} />
        </LinearGradient>
        <LinearGradient id='metal' x1='0' y1='0' x2='1' y2='0'>
          <Stop offset='0' stopColor={metalLight} />
          <Stop offset='0.5' stopColor={metalDark} />
          <Stop offset='1' stopColor={metalLight} />
        </LinearGradient>
      </Defs>

      {/* mist puffs, trailing away from the nozzle */}
      <Circle cx={40} cy={36} r={3.5} fill={mist} opacity={0.9} />
      <Circle cx={29} cy={28} r={2.5} fill={mist} opacity={0.65} />
      <Circle cx={22} cy={41} r={2} fill={mist} opacity={0.5} />
      <Circle cx={32} cy={48} r={1.6} fill={mist} opacity={0.6} />
      <Circle cx={14} cy={33} r={1.4} fill={mist} opacity={0.35} />

      {/* cap, sprayer head + nozzle, neck */}
      <Rect x={70} y={14} width={20} height={18} rx={5} fill='url(#metal)' />
      <Rect x={64} y={32} width={32} height={14} rx={4} fill='url(#metal)' />
      <Rect x={56} y={35} width={9} height={7} rx={2.5} fill={metalDark} />
      <Rect x={72} y={46} width={16} height={12} fill='url(#metal)' />

      {/* bottle body */}
      <Rect x={38} y={56} width={84} height={118} rx={26} fill='url(#glass)' />
      {/* glass highlight */}
      <Rect
        x={48}
        y={68}
        width={12}
        height={64}
        rx={6}
        fill='#ffffff'
        opacity={0.3}
      />
      {/* label with a droplet mark */}
      <Rect
        x={56}
        y={96}
        width={48}
        height={40}
        rx={10}
        fill='#ffffff'
        opacity={0.92}
      />
      <Path
        d='M80 105 C 75 113, 71.5 117.5, 71.5 122 A 8.5 8.5 0 0 0 88.5 122 C 88.5 117.5, 85 113, 80 105 Z'
        fill={glassBottom}
        opacity={0.85}
      />
    </Svg>
  )
}

// Full-screen soft radial glows behind the sign-in content — emerald (brand)
// top-right, sky (secondary) bottom-left.
export function SignInBackdrop() {
  const { theme } = useTheme()
  const { width, height } = useWindowDimensions()
  const dark = theme === "dark"

  const emerald = getColor(dark ? "emerald-500" : "emerald-400")
  const sky = getColor(dark ? "sky-500" : "sky-400")

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute" }}
      pointerEvents='none'>
      <Defs>
        <RadialGradient id='glow-emerald'>
          <Stop offset='0' stopColor={emerald} stopOpacity={dark ? 0.22 : 0.3} />
          <Stop offset='1' stopColor={emerald} stopOpacity='0' />
        </RadialGradient>
        <RadialGradient id='glow-sky'>
          <Stop offset='0' stopColor={sky} stopOpacity={dark ? 0.14 : 0.2} />
          <Stop offset='1' stopColor={sky} stopOpacity='0' />
        </RadialGradient>
      </Defs>
      <Circle
        cx={width * 0.85}
        cy={height * 0.12}
        r={width * 0.6}
        fill='url(#glow-emerald)'
      />
      <Circle
        cx={width * 0.08}
        cy={height * 0.88}
        r={width * 0.55}
        fill='url(#glow-sky)'
      />
    </Svg>
  )
}
