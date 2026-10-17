import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import { useOnboarding, type OnboardingStep } from "@/lib/utils/use-onboarding"

// Inline "Getting started" card — Collection tab's FlatList header, not a
// separate carousel screen, so it sits right next to the empty state it's
// meant to replace/extend and disappears the moment all 3 steps are real
// (derived from actual collection state, not a one-time "seen" flag —
// resumable if the user skips it and comes back via the Profile tab row).
const OnboardingChecklist = () => {
  const router = useRouter()
  const { theme, baseTextClass, mutedTextClass, accentColors, accentTintBg, baseBorderClass, cardColors } = useTheme()
  const { loaded, dismissed, dismiss, steps, allDone } = useOnboarding()
  const { t } = useLocale()

  if (!loaded || dismissed || allDone) return null

  const onStepPress = (key: OnboardingStep["key"]) => {
    if (key === "add") router.navigate("/(tabs)/(search)")
    else if (key === "wear") router.navigate("/(tabs)/(collection)")
    else router.push("/picker")
  }

  return (
    <View
      className={`mx-3 mt-3 mb-1 rounded-2xl ${cardColors.background} p-4`}
      accessibilityRole='summary'
      accessibilityLabel={t("onboarding.title")}>
      <View className='flex-row items-center justify-between'>
        <Text className={`${baseTextClass} text-base font-bold`}>{t("onboarding.title")}</Text>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={t("onboarding.skipLabel")}>
          <Text className={`${mutedTextClass} text-sm font-semibold`}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>
      </View>
      {steps.map((step) => (
        <TouchableOpacity
          key={step.key}
          onPress={() => onStepPress(step.key)}
          disabled={step.done || !step.enabled}
          className='flex-row items-center pt-3'
          accessibilityRole='button'
          accessibilityState={{ disabled: step.done || !step.enabled }}
          accessibilityLabel={step.done ? t("onboarding.stepDone", { label: step.label }) : step.label}>
          <MaterialCommunityIcons
            name={step.done ? "check-circle" : "circle-outline"}
            size={22}
            color={
              step.done
                ? getColor(accentColors)
                : getColor(theme === "dark" ? "zinc-600" : "zinc-300")
            }
          />
          <View className='flex-1 pl-3'>
            <Text
              className={`${step.done ? mutedTextClass : baseTextClass} text-sm font-semibold ${
                step.done ? "line-through" : ""
              }`}>
              {step.label}
            </Text>
            <Text className={`${mutedTextClass} text-xs pt-0.5`}>{step.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default OnboardingChecklist
