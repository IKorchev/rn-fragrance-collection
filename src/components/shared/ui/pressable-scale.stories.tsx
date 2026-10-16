import React from "react"
import { Text, View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import PressableScale from "./pressable-scale"

const meta = {
  title: "UI/PressableScale",
  component: PressableScale,
  args: { onPress: () => {}, children: null },
} satisfies Meta<typeof PressableScale>

export default meta
type Story = StoryObj<typeof meta>

// Press and hold to see it spring to 96% — the effect is in the interaction,
// not the static render
export const Default: Story = {
  args: {
    className: "bg-emerald-600 rounded-full px-5 py-3 items-center",
    children: <Text className='text-white font-semibold'>Press and hold me</Text>,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    className: "bg-zinc-300 rounded-full px-5 py-3 items-center",
    children: <Text className='text-zinc-500 font-semibold'>Disabled — no spring</Text>,
  },
}

export const WrappingAnything: Story = {
  render: () => (
    <View style={{ gap: 12, alignItems: "flex-start" }}>
      <PressableScale className='bg-emerald-600 rounded-full h-11 w-11 items-center justify-center' onPress={() => {}}>
        <Text className='text-white font-bold'>+</Text>
      </PressableScale>
      <PressableScale className='border border-zinc-300 rounded-2xl px-4 py-3' onPress={() => {}}>
        <Text className='text-zinc-900 font-semibold'>A whole card</Text>
      </PressableScale>
    </View>
  ),
}
