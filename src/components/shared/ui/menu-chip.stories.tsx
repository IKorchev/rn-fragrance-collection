import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import MenuChip from "./menu-chip"

// Trigger only — wrap it in a NativeMenu at the call site
const meta = {
  title: "UI/MenuChip",
  component: MenuChip,
  args: { label: "This week", accessibilityLabel: "Time period" },
} satisfies Meta<typeof MenuChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { label: "Most worn", accessibilityLabel: "Sort", active: true } }
