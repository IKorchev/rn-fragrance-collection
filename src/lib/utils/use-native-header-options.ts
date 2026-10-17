import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"

// Shared options for every native-stack header: the platform's own header
// (iOS large titles and Liquid Glass bar buttons, Material toolbar on
// Android), themed to sit flush on the page with no hairline. Tab roots add
// `headerLargeTitle: true` on top.
export const useNativeHeaderOptions = () => {
  const { baseColors, headerColors } = useTheme()
  const ink = getColor(baseColors)
  const background = getColor(headerColors.background.replace("bg-", ""))

  return {
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerStyle: { backgroundColor: background },
    headerTintColor: ink,
    headerTitleStyle: { color: ink },
    headerLargeTitleStyle: { color: ink },
    headerBackButtonDisplayMode: "minimal" as const,
  }
}

export default useNativeHeaderOptions
