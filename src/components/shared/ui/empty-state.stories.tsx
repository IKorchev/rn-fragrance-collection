import React from "react"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import EmptyState from "./empty-state"

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  args: {
    icon: "bottle-tonic-outline",
    title: "Nothing logged yet",
    message: "Tap the spray icon next time you wear something — that starts the diary.",
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TitleOnly: Story = { args: { message: undefined } }

export const WithAction: Story = {
  args: {
    icon: "magnify-close",
    title: "No entries match",
    message: "Try changing your search or filters.",
    actionLabel: "Clear filters",
    onAction: () => {},
  },
}

// Error states stay plain and utilitarian — no illustration
export const QueryError: Story = {
  args: {
    icon: "cloud-alert",
    title: "Couldn't load your diary",
    message: "Check your connection and try again.",
    actionLabel: "Try again",
    onAction: () => {},
  },
}
