import React from "react"
import { View, Text } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import Button from "./button"

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

// Shared centered placeholder for empty lists and query errors — pass an
// action to render a CTA (e.g. "Find fragrances", "Try again").
const EmptyState = ({ icon, title, message, actionLabel, onAction }: EmptyStateProps) => {
  const { baseTextClass, mutedTextClass, mutedColors } = useTheme()

  return (
    <View className='items-center px-8 pt-16'>
      <MaterialCommunityIcons name={icon} size={44} color={getColor(mutedColors)} />
      <Text className={`${baseTextClass} text-lg font-semibold text-center pt-4`}>{title}</Text>
      {message && (
        <Text className={`${mutedTextClass} text-base text-center pt-2`}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <Button variant='primary' fullWidth={false} label={actionLabel} onPress={onAction} className='mt-6 px-6' />
      )}
    </View>
  )
}

export default EmptyState
