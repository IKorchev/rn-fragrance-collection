import React from "react"
import { Text, TouchableOpacity } from "react-native"
import useTheme from "@/contexts/theme-context"

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"
// Text color override for "secondary"/"ghost" (bordered/text-only variants
// have no fixed color of their own — "primary"/"danger" are always white/danger)
type ButtonTone = "base" | "accent" | "danger"
type ButtonShape = "pill" | "rounded"

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  tone?: ButtonTone
  shape?: ButtonShape
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
  fullWidth?: boolean
  size?: "md" | "sm"
  className?: string
  testID?: string
}

const Button = ({
  label,
  onPress,
  variant = "primary",
  tone = "base",
  shape = "pill",
  loading,
  loadingLabel,
  disabled,
  fullWidth = true,
  size = "md",
  className,
  testID,
}: ButtonProps) => {
  const { primaryBg, baseBorderClass, baseTextClass, accentTextClass, danger } = useTheme()
  const isDisabled = disabled || loading
  const shapeClass = shape === "pill" ? "rounded-full" : "rounded-2xl"
  // fullWidth only ever adds "w-full" — it has no opinion when false, so a
  // caller placed in a flex-1 row (e.g. 3 buttons sharing a row) isn't forced
  // into unwanted padding. Intrinsic-width buttons (EmptyState's CTA) supply
  // their own "px-6" via className instead.
  const widthClass = fullWidth ? "w-full" : ""
  const shownLabel = loading && loadingLabel ? loadingLabel : label

  const toneTextClass =
    tone === "danger" ? danger.textClass : tone === "accent" ? accentTextClass : baseTextClass

  const containerByVariant: Record<ButtonVariant, string> = {
    primary: `${primaryBg} ${widthClass} py-3 ${shapeClass} items-center ${isDisabled ? "opacity-40" : ""}`,
    secondary: `border ${baseBorderClass} ${widthClass} py-2.5 ${shapeClass} items-center ${isDisabled ? "opacity-40" : ""}`,
    danger: `${danger.bgClass} ${widthClass} py-2.5 ${shapeClass} items-center ${isDisabled ? "opacity-40" : ""}`,
    ghost: `py-2 items-center ${isDisabled ? "opacity-40" : ""}`,
  }

  const labelByVariant: Record<ButtonVariant, string> = {
    primary: "text-white font-semibold",
    secondary: `${toneTextClass} font-semibold`,
    danger: `${danger.textClass} font-semibold`,
    ghost: `${toneTextClass} font-semibold ${size === "sm" ? "text-sm" : "text-base"}`,
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      className={`${containerByVariant[variant]} ${className ?? ""}`}>
      <Text className={labelByVariant[variant]}>{shownLabel}</Text>
    </TouchableOpacity>
  )
}

export default Button
