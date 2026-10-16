import React, { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import Button from "./button"
import Dialog from "./dialog"

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  // `children` is satisfied here so each story can supply its own via render
  args: { visible: true, title: "Appearance", onClose: () => {}, children: null },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

const Options = ({ initial = "light" }: { initial?: string }) => {
  const { baseTextClass, accentTextClass, accentColors } = useTheme()
  const [selected, setSelected] = useState(initial)

  return (
    <>
      {[
        { key: "system", label: "Match system" },
        { key: "light", label: "Light" },
        { key: "dark", label: "Dark" },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          className='flex-row items-center justify-between py-3'
          onPress={() => setSelected(key)}>
          <Text className={key === selected ? `${accentTextClass} font-semibold` : baseTextClass}>
            {label}
          </Text>
          {key === selected && (
            <MaterialCommunityIcons name='check' size={18} color={getColor(accentColors)} />
          )}
        </TouchableOpacity>
      ))}
    </>
  )
}

// Rendered open — the story is the dialog itself, not the trigger
export const OptionPicker: Story = {
  render: (args) => (
    <Dialog {...args}>
      <Options />
    </Dialog>
  ),
}

export const CustomCancelLabel: Story = {
  args: { title: "Language", cancelLabel: "Close" },
  render: (args) => (
    <Dialog {...args}>
      <Options initial='system' />
    </Dialog>
  ),
}

// Toggle it to check the fade and the tap-outside-to-close behaviour
export const Triggered: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <View>
        <Button label='Open dialog' fullWidth={false} onPress={() => setOpen(true)} />
        <Dialog visible={open} title='Appearance' onClose={() => setOpen(false)}>
          <Options />
        </Dialog>
      </View>
    )
  },
}
