import React from "react"
import { Text, View } from "react-native"
import type { Meta, StoryObj } from "@storybook/react-native-web-vite"
import useTheme from "@/contexts/theme-context"
import { getColor } from "@/lib/utils/colors"
import { radius, tokens, typography } from "./tokens"

// A live reference for the token layer — flip the Theme toolbar to compare
// the two sets side by side.
const meta = {
  title: "Design system/Tokens",
} satisfies Meta<Record<string, never>>

export default meta
type Story = StoryObj<typeof meta>

const Swatch = ({ name, value, note }: { name: string; value: string; note?: string }) => {
  const { baseTextClass, mutedTextClass, cardBorderColors } = useTheme()
  // Roles are stored as bare Tailwind steps ("zinc-900"); anything already a
  // real color (rgba from the tint roles) passes straight through.
  const resolved = value.startsWith("rgb") || value.startsWith("#") ? value : getColor(value)

  return (
    <View className='flex-row items-center' style={{ gap: 12, paddingVertical: 6 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: resolved,
          borderWidth: 1,
          borderColor: getColor(cardBorderColors),
        }}
      />
      <View>
        <Text className={`${baseTextClass} text-sm font-semibold`}>{name}</Text>
        <Text className={`${mutedTextClass} text-xs`}>
          {value}
          {note ? ` · ${note}` : ""}
        </Text>
      </View>
    </View>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { mutedTextClass } = useTheme()
  return (
    <View style={{ paddingBottom: 20 }}>
      <Text className={`${mutedTextClass} ${typography.sectionHeading}`}>{title}</Text>
      <View style={{ paddingTop: 6 }}>{children}</View>
    </View>
  )
}

export const Colors: Story = {
  render: () => {
    const { theme } = useTheme()
    const t = tokens[theme]

    return (
      <View>
        <Section title={`Content · ${theme}`}>
          <Swatch name='ink' value={t.ink.token} note={t.ink.text} />
          <Swatch name='inkMuted' value={t.inkMuted.token} note={t.inkMuted.text} />
        </Section>

        <Section title='Meaningful color'>
          <Swatch name='accent' value={t.accent.token} note='brand / act' />
          <Swatch name='highlight' value={t.highlight.token} note='selection / you are here' />
          <Swatch name='danger' value={t.danger.token} note={t.danger.text} />
          <Swatch name='line' value={t.line.token} note={t.line.border} />
        </Section>

        <Section title='Tints (raw colors, used via style)'>
          <Swatch name='accentTintBg' value={t.accentTintBg} />
          <Swatch name='highlightTintBg' value={t.highlightTintBg} />
        </Section>
      </View>
    )
  },
}

export const Surfaces: Story = {
  render: () => {
    const { theme, baseTextClass, mutedTextClass, baseBorderClass } = useTheme()
    const t = tokens[theme]
    const surfaces = [
      { name: "page", role: t.page, note: "behind everything" },
      { name: "card", role: t.card, note: "list rows" },
      { name: "modal", role: t.modal, note: "sheets and dialogs" },
      { name: "header", role: t.header, note: "top and tab chrome" },
    ]

    return (
      <View style={{ gap: 12 }}>
        {surfaces.map(({ name, role, note }) => (
          <View key={name} className={`${role.background} border ${baseBorderClass} ${radius.card} p-4`}>
            <Text className={`${baseTextClass} text-sm font-semibold`}>
              {name} · {role.background}
            </Text>
            <Text className={`${mutedTextClass} text-xs pt-1`}>{note}</Text>
          </View>
        ))}
      </View>
    )
  },
}

export const Radius: Story = {
  render: () => {
    const { baseTextClass, primaryBg } = useTheme()
    return (
      <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(radius).map(([name, cls]) => (
          <View key={name} style={{ alignItems: "center", gap: 6 }}>
            <View className={`${primaryBg} ${cls}`} style={{ width: 72, height: 72 }} />
            <Text className={`${baseTextClass} text-xs`}>{name}</Text>
          </View>
        ))}
      </View>
    )
  },
}

export const Typography: Story = {
  render: () => {
    const { baseTextClass, mutedTextClass } = useTheme()
    return (
      <View style={{ gap: 14 }}>
        {Object.entries(typography).map(([name, cls]) => (
          <View key={name}>
            <Text className={`${baseTextClass} ${cls}`}>
              {name === "display" ? "Whiff" : "The quick brown fox"}
            </Text>
            <Text className={`${mutedTextClass} text-xs pt-1`}>
              {name} · {cls}
            </Text>
          </View>
        ))}
      </View>
    )
  },
}
