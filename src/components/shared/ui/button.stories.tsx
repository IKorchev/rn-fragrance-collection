import React from "react"
import { View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import Button from "./button"

const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    label: "Add to collection",
    onPress: () => {},
    fullWidth: false,
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "danger", "ghost"] },
    tone: { control: "select", options: ["base", "accent", "danger"] },
    shape: { control: "radio", options: ["pill", "rounded"] },
    size: { control: "radio", options: ["md", "sm"] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = { args: { variant: "secondary" } }

export const Danger: Story = { args: { variant: "danger", label: "Delete account" } }

export const Ghost: Story = { args: { variant: "ghost", tone: "danger", label: "Delete account" } }

export const Loading: Story = {
  args: { loading: true, loadingLabel: "Deleting account…", label: "Delete account" },
}

export const Disabled: Story = { args: { disabled: true } }

// The tone prop only colors the variants that have no fixed color of their own
export const Tones: Story = {
  render: (args) => (
    <View style={{ gap: 12 }}>
      <Button {...args} variant='secondary' tone='base' label='Base tone' />
      <Button {...args} variant='secondary' tone='accent' label='Accent tone' />
      <Button {...args} variant='secondary' tone='danger' label='Danger tone' />
    </View>
  ),
}

export const AllVariants: Story = {
  render: (args) => (
    <View style={{ gap: 12 }}>
      <Button {...args} variant='primary' label='Primary' />
      <Button {...args} variant='secondary' label='Secondary' />
      <Button {...args} variant='danger' label='Danger' />
      <Button {...args} variant='ghost' label='Ghost' />
    </View>
  ),
}
