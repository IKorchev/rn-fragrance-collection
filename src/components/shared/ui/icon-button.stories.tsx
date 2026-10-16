import React from "react"
import { View } from "react-native"
import { MaterialCommunityIcons, AntDesign } from "@expo/vector-icons"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import IconButton from "./icon-button"

const meta = {
  title: "UI/IconButton",
  component: IconButton,
  args: {
    bgClassName: "bg-emerald-600",
    onPress: () => {},
    accessibilityLabel: "Add",
    children: <MaterialCommunityIcons name='plus' size={22} color='white' />,
  },
  argTypes: {
    size: { control: "radio", options: ["md", "lg", "xl"] },
    dimmed: { control: "boolean" },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Dimmed: Story = { args: { dimmed: true } }

export const Sizes: Story = {
  render: (args) => (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <IconButton {...args} size='md' />
      <IconButton {...args} size='lg' />
      <IconButton {...args} size='xl' />
    </View>
  ),
}

// The component never derives colors — the caller passes a complete literal,
// normally one of useTheme()'s class fields
export const ThemedBackgrounds: Story = {
  render: () => {
    const { primaryBg, buttons } = useTheme()
    return (
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <IconButton bgClassName={primaryBg} onPress={() => {}} accessibilityLabel='Add'>
          <MaterialCommunityIcons name='plus' size={22} color='white' />
        </IconButton>
        <IconButton bgClassName={buttons.deleteBg} onPress={() => {}} accessibilityLabel='Delete'>
          <AntDesign name='delete' size={18} color={getColor(buttons.deleteIcon)} />
        </IconButton>
      </View>
    )
  },
}
