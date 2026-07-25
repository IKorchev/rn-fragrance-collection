import React from "react"
import { View } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { cssInterop } from "nativewind"
import type { Preview } from "@storybook/react-native-web-vite"
import { ThemeContextProvider, THEME_STORAGE_KEY } from "../src/contexts/theme-context"
import useTheme from "../src/contexts/theme-context"
import { AnimatedPressable } from "../src/components/shared/ui/pressable-scale"
import "../src/global.css"

// NativeWind maps className to style automatically for React Native's own
// components, but not for one built by Animated.createAnimatedComponent. On
// native the class still lands; on react-native-web it's dropped, which would
// render every PressableScale-based control (IconButton, Card.ActionPill)
// unstyled here. Registering it makes Storybook match the device.
cssInterop(AnimatedPressable, { className: "style" })

// Renders the story on the active theme's page surface, so contrast is judged
// against the same background the app uses.
const Canvas = ({ children }: { children: React.ReactNode }) => {
  const { viewColors } = useTheme()

  return (
    <View className={`flex-1 p-4 ${viewColors.background}`} style={{ minHeight: "100vh" as never }}>
      {children}
    </View>
  )
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "App theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as "light" | "dark"
      // ThemeContextProvider owns its preference and hydrates it from storage
      // on mount, so setting the theme from outside loses a race with that
      // async read. Seeding storage first and keying the provider on the theme
      // makes the remount read the value we just wrote.
      AsyncStorage.setItem(THEME_STORAGE_KEY, theme)

      return (
        <ThemeContextProvider key={theme}>
          <Canvas>
            <Story />
          </Canvas>
        </ThemeContextProvider>
      )
    },
  ],

  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
  },
}

export default preview
