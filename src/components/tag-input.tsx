import React, { useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { addTag, removeTag, MAX_TAGS_PER_FRAGRANCE, MAX_TAG_LENGTH } from "@/lib/utils/tags"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

// Free feature — organizing your own collection isn't a Pro upsell (see
// src/lib/entitlements.ts). Chips + an inline add field; normalization
// (lowercase/trim/dedupe/cap) mirrors the DB's valid_tag_array check.
const TagInput = ({ tags, onChange }: TagInputProps) => {
  const { theme, mutedTextClass, accentColors, accentTintBg, mutedColors } = useTheme()
  const [draft, setDraft] = useState("")

  const commitDraft = () => {
    if (!draft.trim()) return
    onChange(addTag(tags, draft))
    setDraft("")
  }

  const atLimit = tags.length >= MAX_TAGS_PER_FRAGRANCE

  return (
    <View>
      <View className='flex-row flex-wrap' style={{ gap: 8 }}>
        {tags.map((tag) => (
          <View
            key={tag}
            className='flex-row items-center rounded-full pl-3 pr-2 py-1.5'
            style={{ backgroundColor: accentTintBg }}>
            <Text style={{ color: getColor(accentColors) }} className='text-sm font-semibold'>
              {tag}
            </Text>
            <TouchableOpacity
              onPress={() => onChange(removeTag(tags, tag))}
              hitSlop={8}
              accessibilityLabel={`Remove tag ${tag}`}
              className='pl-1.5'>
              <MaterialCommunityIcons name='close' size={14} color={getColor(accentColors)} />
            </TouchableOpacity>
          </View>
        ))}
        {!atLimit && (
          <View
            className={`flex-row items-center rounded-full px-3 py-1 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={commitDraft}
              onBlur={commitDraft}
              placeholder='Add tag'
              placeholderTextColor={getColor(mutedColors)}
              maxLength={MAX_TAG_LENGTH}
              autoCapitalize='none'
              autoCorrect={false}
              returnKeyType='done'
              className='text-sm py-0.5'
              style={{ color: getColor(theme === "dark" ? "zinc-100" : "zinc-900"), minWidth: 64 }}
            />
          </View>
        )}
      </View>
      {tags.length === 0 && (
        <Text className={`${mutedTextClass} text-xs pt-2`}>
          Tag it — "signature", "winter", "gift" — to filter the picker and your wear history later.
        </Text>
      )}
      {atLimit && (
        <Text className={`${mutedTextClass} text-xs pt-2`}>
          Up to {MAX_TAGS_PER_FRAGRANCE} tags per fragrance.
        </Text>
      )}
    </View>
  )
}

export default TagInput
