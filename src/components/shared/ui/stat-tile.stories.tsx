import React from "react"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import { getColor } from "@/lib/utils/colors"
import StatTile from "./stat-tile"

const meta = {
  title: "UI/StatTile",
  component: StatTile,
  args: {
    items: [
      { value: 17, label: "In collection" },
      { value: 26, label: "Times worn" },
    ],
  },
  argTypes: {
    columns: { control: { type: "number", min: 1, max: 4 } },
    size: { control: "radio", options: ["md", "sm"] },
  },
} satisfies Meta<typeof StatTile>

export default meta
type Story = StoryObj<typeof meta>

export const Pair: Story = {}

export const Three: Story = {
  args: {
    items: [
      { value: 26, label: "Times worn" },
      { value: 4, label: "This week" },
      { value: 12, label: "Unique scents" },
    ],
  },
}

// columns wraps the items into a grid — the profile screen's 2x2 block
export const Grid: Story = {
  args: {
    columns: 2,
    items: [
      { value: 17, label: "In collection" },
      { value: 26, label: "Times worn" },
      { value: 31, label: "This month" },
      { value: 4, label: "Day streak" },
    ],
  },
}

export const Small: Story = { args: { size: "sm" } }

// A per-item color overrides the accent, for values that carry their own meaning
export const CustomValueColors: Story = {
  args: {
    items: [
      { value: 31, label: "This month" },
      { value: 0, label: "Day streak", color: getColor("rose-500") },
    ],
  },
}

export const LongLabels: Story = {
  args: {
    columns: 2,
    items: [
      { value: "1,284", label: "Fragrances in your collection" },
      { value: "12h", label: "Longest wearing session" },
      { value: 4, label: "Unique scents" },
      { value: 99, label: "Badges" },
    ],
  },
}
