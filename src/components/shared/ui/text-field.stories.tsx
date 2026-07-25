import React, { useState } from "react"
import { View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import TextField from "./text-field"

const meta = {
  title: "UI/TextField",
  component: TextField,
  args: { value: "", onChangeText: () => {}, placeholder: "Brand" },
  argTypes: { rounded: { control: "radio", options: ["xl", "2xl"] } },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

// Controlled component — stories own the state so typing actually works
const Controlled = (props: React.ComponentProps<typeof TextField>) => {
  const [value, setValue] = useState(props.value)
  return <TextField {...props} value={value} onChangeText={setValue} />
}

export const Empty: Story = { render: (args) => <Controlled {...args} /> }

export const Filled: Story = {
  args: { value: "Creed" },
  render: (args) => <Controlled {...args} />,
}

export const Multiline: Story = {
  args: {
    placeholder: "Notes — how does it wear on you?",
    multiline: true,
    minHeightClass: "min-h-[96px]",
    maxLength: 2000,
  },
  render: (args) => <Controlled {...args} />,
}

export const Rounded: Story = {
  render: (args) => (
    <View style={{ gap: 12 }}>
      <Controlled {...args} rounded='xl' placeholder='rounded-xl' />
      <Controlled {...args} rounded='2xl' placeholder='rounded-2xl' />
    </View>
  ),
}
