import React from "react"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import NativeMenu from "./native-menu"
import GlassCircle from "./glass-circle"

// The menu itself is native (SwiftUI / Compose) — on web Storybook only the
// trigger renders and actions don't fire. Check the real menu on a device.
const meta = {
  title: "UI/NativeMenu",
  component: NativeMenu,
  args: {
    title: "Collection photo",
    items: [
      { id: "camera", title: "Take photo", icon: "camera", onPress: () => {} },
      { id: "library", title: "Choose from library", icon: "photo.on.rectangle", onPress: () => {} },
      { id: "remove", title: "Remove photo", icon: "trash", destructive: true, onPress: () => {} },
    ],
    children: (
      <GlassCircle fallbackBgClassName='bg-zinc-100' accessibilityLabel='Change collection photo'>
        <MaterialCommunityIcons name='camera-outline' size={22} color='#71717a' />
      </GlassCircle>
    ),
  },
} satisfies Meta<typeof NativeMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Dimmed: Story = {
  args: {
    children: (
      <GlassCircle fallbackBgClassName='bg-zinc-100' dimmed accessibilityLabel='Change collection photo'>
        <MaterialCommunityIcons name='camera-outline' size={22} color='#71717a' />
      </GlassCircle>
    ),
  },
}
