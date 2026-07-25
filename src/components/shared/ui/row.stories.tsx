import React, { useState } from "react"
import { Switch, Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import Row from "./row"
import RowGroup from "./row-group"

const meta = {
  title: "UI/Row",
  component: Row,
  args: { icon: "history", label: "Scent diary", onPress: () => {} },
  argTypes: {
    tone: { control: "radio", options: ["base", "accent", "danger"] },
  },
} satisfies Meta<typeof Row>

export default meta
type Story = StoryObj<typeof meta>

export const Base: Story = {}

export const Accent: Story = {
  args: { icon: "star-four-points", tone: "accent", label: "Upgrade to Pro" },
}

// Danger drops the chevron — it's an action, not navigation
export const Danger: Story = { args: { icon: "logout", tone: "danger", label: "Sign out" } }

// Without onPress the row isn't pressable and renders no chevron
export const NonPressable: Story = {
  render: () => {
    const [on, setOn] = useState(true)
    return (
      <Row
        icon='bell-outline'
        label='Daily reminder'
        trailing={<Switch value={on} onValueChange={setOn} />}
      />
    )
  },
}

export const WithTrailingValue: Story = {
  render: () => {
    const { mutedTextClass, mutedColors } = useTheme()
    return (
      <Row
        icon='theme-light-dark'
        label='Appearance'
        onPress={() => {}}
        trailing={
          <View className='flex-row items-center' style={{ gap: 4 }}>
            <Text className={`${mutedTextClass} text-base`}>Light</Text>
            <MaterialCommunityIcons name='chevron-right' size={20} color={getColor(mutedColors)} />
          </View>
        }
      />
    )
  },
}

// Inside a RowGroup the row renders flat — the group's card supplies the
// border and rounding, and hairlines are inset to the label column
export const InsideAGroup: Story = {
  render: () => (
    <RowGroup title='Account'>
      <Row icon='export-variant' label='Export your data' onPress={() => {}} />
      <Row icon='shield-lock-outline' label='Privacy Policy' onPress={() => {}} />
      <Row icon='file-document-outline' label='Terms & Conditions' onPress={() => {}} />
      <Row icon='logout' tone='danger' label='Sign out' onPress={() => {}} />
    </RowGroup>
  ),
}
