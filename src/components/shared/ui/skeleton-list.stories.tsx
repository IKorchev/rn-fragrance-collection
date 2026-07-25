import React from "react"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import SkeletonList from "./skeleton-list"

const meta = {
  title: "UI/SkeletonList",
  component: SkeletonList,
  argTypes: { count: { control: { type: "number", min: 1, max: 12 } } },
} satisfies Meta<typeof SkeletonList>

export default meta
type Story = StoryObj<typeof meta>

// Rows are sized to match Card.Root (84px tall, 12px gutter) so content
// doesn't jump when the real list replaces them
export const Default: Story = {}

export const Short: Story = { args: { count: 2 } }

export const Long: Story = { args: { count: 10 } }
