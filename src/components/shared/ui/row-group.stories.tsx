import React, { useState } from "react"
import { Switch, View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import Row from "./row"
import RowGroup from "./row-group"

const meta = {
  title: "UI/RowGroup",
  component: RowGroup,
  // `children` is satisfied here so each story can supply its own via render
  args: { title: "Preferences", children: null },
} satisfies Meta<typeof RowGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => {
    const [reminders, setReminders] = useState(true)
    return (
      <RowGroup {...args}>
        <Row icon='theme-light-dark' label='Appearance' onPress={() => {}} />
        <Row
          icon='bell-outline'
          label='Daily reminder'
          trailing={<Switch value={reminders} onValueChange={setReminders} />}
        />
        <Row icon='earth' label='Public profile' trailing={<Switch value={false} onValueChange={() => {}} />} />
      </RowGroup>
    )
  },
}

// The caption is optional — omit it for a group that needs no heading
export const Untitled: Story = {
  args: { title: undefined },
  render: (args) => (
    <RowGroup {...args}>
      <Row icon='history' label='Scent diary' onPress={() => {}} />
      <Row icon='chart-timeline-variant' label='Share my recap' onPress={() => {}} />
    </RowGroup>
  ),
}

export const SingleRow: Story = {
  args: { title: "Danger zone" },
  render: (args) => (
    <RowGroup {...args}>
      <Row icon='logout' tone='danger' label='Sign out' onPress={() => {}} />
    </RowGroup>
  ),
}

// How the profile screen actually stacks them
export const StackedSections: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <RowGroup title='Activity'>
        <Row icon='history' label='Scent diary' onPress={() => {}} />
        <Row icon='chart-timeline-variant' label='Share my recap' onPress={() => {}} />
      </RowGroup>
      <RowGroup title='Account'>
        <Row icon='export-variant' label='Export your data' onPress={() => {}} />
        <Row icon='logout' tone='danger' label='Sign out' onPress={() => {}} />
      </RowGroup>
    </View>
  ),
}
