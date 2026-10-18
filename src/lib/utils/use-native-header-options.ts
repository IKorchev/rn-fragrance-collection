import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"

// Shared options for every native-stack header: the platform's own header
// (inline title and Liquid Glass bar buttons on iOS, Material toolbar on
// Android), themed to sit flush on the page with no hairline. Tab roots use
// the inline title too, not iOS large titles — the large-title layout
// reserves an empty bar row above the title, which wasted ~50pt per screen.
export const useNativeHeaderOptions = () => {
  const { baseColors, headerColors } = useTheme()
  const ink = getColor(baseColors)
  const background = getColor(headerColors.background.replace("bg-", ""))

  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: background },
    headerTintColor: ink,
    headerTitleStyle: { color: ink },
    headerBackButtonDisplayMode: "minimal" as const,
  }
}

export default useNativeHeaderOptions
