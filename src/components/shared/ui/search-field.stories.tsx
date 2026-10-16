import React, { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import SearchField from "./search-field"

const meta = {
  title: "UI/SearchField",
  component: SearchField,
  args: { value: "", onChangeText: () => {}, placeholder: "Search name or brand" },
} satisfies Meta<typeof SearchField>

export default meta
type Story = StoryObj<typeof meta>

const Controlled = (props: React.ComponentProps<typeof SearchField>) => {
  const [value, setValue] = useState(props.value)
  return <SearchField {...props} value={value} onChangeText={setValue} />
}

export const Empty: Story = { render: (args) => <Controlled {...args} /> }

// The clear button only appears once there's a value — type to toggle it
export const WithValue: Story = {
  args: { value: "Aventus" },
  render: (args) => <Controlled {...args} />,
}

export const CollectionFilter: Story = {
  args: { placeholder: "Search your collection" },
  render: (args) => <Controlled {...args} />,
}
