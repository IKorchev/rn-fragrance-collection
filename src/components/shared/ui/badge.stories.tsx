import React from "react"
import { View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import Badge from "./badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { label: "PRO" },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Wordy: Story = { args: { label: "MODERATOR" } }

// The badge sizes to its label — it has no fixed width
export const Lengths: Story = {
  render: () => (
    <View style={{ gap: 8, alignItems: "flex-start" }}>
      <Badge label='PRO' />
      <Badge label='NEW' />
      <Badge label='MODERATOR' />
      <Badge label='1' />
    </View>
  ),
}
