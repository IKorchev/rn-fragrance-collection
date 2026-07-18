import React, { useEffect, useRef, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import { addTag, removeTag, MAX_TAGS_PER_FRAGRANCE, MAX_TAG_LENGTH } from "@/lib/utils/tags"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => Promise<boolean>
}

const sameTags = (left: string[], right: string[]) =>
  left.length === right.length && left.every((tag, index) => tag === right[index])

// Free feature — organizing your own collection isn't a Pro upsell (see
// src/lib/entitlements.ts). Chips + an inline add field; normalization
// (lowercase/trim/dedupe/cap) mirrors the DB's valid_tag_array check.
const TagInput = ({ tags, onChange }: TagInputProps) => {
  const { theme, mutedTextClass, accentColors, accentTintBg, mutedColors } = useTheme()
  const [draft, setDraft] = useState("")
  const [localTags, setLocalTags] = useState(tags)
  const localTagsRef = useRef(tags)
  const confirmedTagsRef = useRef(tags)
  const pendingTagsRef = useRef<string[] | null>(null)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )

  // Accept query/realtime updates when there is no local save in progress.
  // In-flight props can represent an earlier queued snapshot, so they must
  // not replace newer optimistic edits.
  useEffect(() => {
    if (savingRef.current || pendingTagsRef.current || sameTags(localTagsRef.current, tags)) return
    confirmedTagsRef.current = tags
    localTagsRef.current = tags
    setLocalTags(tags)
  }, [tags])

  const flushPendingTags = async () => {
    if (savingRef.current) return
    savingRef.current = true

    while (pendingTagsRef.current) {
      const nextTags = pendingTagsRef.current
      pendingTagsRef.current = null
      const saved = await onChangeRef.current(nextTags)

      if (!saved) {
        // updateFragrance already surfaces/reports the failure. Drop any
        // later unsent snapshot and return the UI to the last durable state.
        pendingTagsRef.current = null
        localTagsRef.current = confirmedTagsRef.current
        if (mountedRef.current) setLocalTags(confirmedTagsRef.current)
        break
      }

      confirmedTagsRef.current = nextTags
    }

    savingRef.current = false
  }

  const queueTags = (nextTags: string[]) => {
    if (sameTags(localTagsRef.current, nextTags)) return
    localTagsRef.current = nextTags
    setLocalTags(nextTags)
    // Keep only the newest not-yet-started snapshot. The active write stays
    // ordered; rapid intermediate edits collapse into one follow-up write.
    pendingTagsRef.current = nextTags
    void flushPendingTags()
  }

  const commitDraft = () => {
    if (!draft.trim()) return
    queueTags(addTag(localTagsRef.current, draft))
    setDraft("")
  }

  const atLimit = localTags.length >= MAX_TAGS_PER_FRAGRANCE

  return (
    <View>
      <View className='flex-row flex-wrap' style={{ gap: 8 }}>
        {localTags.map((tag) => (
          <View
            key={tag}
            className='flex-row items-center rounded-full pl-3 pr-2 py-1.5'
            style={{ backgroundColor: accentTintBg }}>
            <Text style={{ color: getColor(accentColors) }} className='text-sm font-semibold'>
              {tag}
            </Text>
            <TouchableOpacity
              onPress={() => queueTags(removeTag(localTagsRef.current, tag))}
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
      {localTags.length === 0 && (
        <Text className={`${mutedTextClass} text-xs pt-2`}>
          Tag it — "signature", "winter", "gift" — to filter the picker and your scent diary later.
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
