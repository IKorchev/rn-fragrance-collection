import React, { useState } from "react"
import { View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import FilterChip from "./filter-chip"

const meta = {
  title: "UI/FilterChip",
  component: FilterChip,
  args: { label: "Creed", selected: false, onPress: () => {} },
} satisfies Meta<typeof FilterChip>

export default meta
type Story = StoryObj<typeof meta>

export const Unselected: Story = {}

// Selected uses the warm highlight, not the emerald accent: amber means
// "you are here", emerald means "act"
export const Selected: Story = { args: { selected: true } }

export const Row: Story = {
  render: () => {
    const [active, setActive] = useState("month")
    const periods = [
      { key: "day", label: "Today" },
      { key: "week", label: "Week" },
      { key: "month", label: "Month" },
      { key: "year", label: "Year" },
      { key: "all", label: "All Time" },
    ]

    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {periods.map((p) => (
          <FilterChip
            key={p.key}
            label={p.label}
            selected={active === p.key}
            onPress={() => setActive(p.key)}
          />
        ))}
      </View>
    )
  },
}
