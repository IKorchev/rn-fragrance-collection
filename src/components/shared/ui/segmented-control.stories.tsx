import React, { useState } from "react"
import { View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import { getColor } from "@/lib/utils/colors"
import SegmentedControl from "./segmented-control"

const meta = {
  title: "UI/SegmentedControl",
  component: SegmentedControl,
  // Every story is stateful and drives its own options via render — these
  // satisfy the required props so the stories don't each restate them.
  args: { options: [], onChange: () => {} },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const SingleSelect: Story = {
  render: () => {
    const [value, setValue] = useState("fragrances")
    return (
      <SegmentedControl
        options={[
          { label: "Fragrances", value: "fragrances" },
          { label: "Collectors", value: "collectors" },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const ManyOptions: Story = {
  render: () => {
    const [value, setValue] = useState("spring")
    return (
      <SegmentedControl
        options={[
          { label: "Spring", value: "spring" },
          { label: "Summer", value: "summer" },
          { label: "Autumn", value: "autumn" },
          { label: "Winter", value: "winter" },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  },
}

// Pass `values` instead of `value` for multi-select — onChange still fires the
// tapped value and the caller owns the toggle logic
export const MultiSelect: Story = {
  render: () => {
    const [values, setValues] = useState<string[]>(["summer"])
    const toggle = (v: string) =>
      setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))

    return (
      <SegmentedControl
        options={[
          { label: "Spring", value: "spring" },
          { label: "Summer", value: "summer" },
          { label: "Autumn", value: "autumn" },
          { label: "Winter", value: "winter" },
        ]}
        values={values}
        onChange={toggle}
      />
    )
  },
}

// A per-option tint replaces the accent for the selected state
export const Tinted: Story = {
  render: () => {
    const [value, setValue] = useState("moderate")
    return (
      <SegmentedControl
        options={[
          { label: "Intimate", value: "intimate", tint: getColor("sky-500") },
          { label: "Moderate", value: "moderate", tint: getColor("emerald-500") },
          { label: "Strong", value: "strong", tint: getColor("amber-500") },
          { label: "Enormous", value: "enormous", tint: getColor("rose-500") },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const NothingSelected: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <SegmentedControl
        options={[
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ]}
        value={null}
        onChange={() => {}}
      />
    </View>
  ),
}
