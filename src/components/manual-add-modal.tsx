import React, { useEffect, useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native"
import { getColor } from "@/lib/utils/colors"
import { useDebouncedValue } from "@/lib/utils/use-debounced-value"
import { useFragranceSearch, MIN_SEARCH_LENGTH } from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import Card from "@/components/card"

interface ManualAddModalProps {
  visible: boolean
  // Prefill for the title field (e.g. the search term that found nothing)
  initialTitle?: string
  onClose: () => void
}

// Catalog gap escape hatch: add a fragrance by hand (brand + name, no image).
// The row gets no fragrance_id FK — same shape as legacy pre-catalog rows.
// A live "did you mean" strip catches near-misses against the catalog; the
// add_manual_fragrance RPC also queues a catalog suggestion in the same
// transaction (pending moderator review, best-effort — it can't fail the add).
const ManualAddModal = ({ visible, initialTitle, onClose }: ManualAddModalProps) => {
  const {
    theme,
    modalColors,
    baseTextClass,
    mutedTextClass,
    accentTextClass,
    baseColors,
    mutedColors,
  } = useTheme()
  const { addFragranceToCollection, addManualFragrance } = useAuth()
  const [brand, setBrand] = useState("")
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setBrand("")
      setTitle(initialTitle ?? "")
    }
  }, [visible, initialTitle])

  const term = `${brand.trim()} ${title.trim()}`.trim()
  const debouncedTerm = useDebouncedValue(term, 400)
  const { data: matchData } = useFragranceSearch(visible ? debouncedTerm : "", { brand: null })
  // Gate on the LIVE term, not just the query result: keepPreviousData keeps
  // serving the previous search's rows while the query is disabled (inputs
  // cleared, or reopened — the component stays mounted), and those must not
  // render as matches for empty inputs.
  const matches = term.length >= MIN_SEARCH_LENGTH ? (matchData ?? []).slice(0, 3) : []

  const canAdd = brand.trim().length > 0 && title.trim().length > 0 && !saving

  const handleAdd = async () => {
    setSaving(true)
    try {
      await addManualFragrance({ brand: brand.trim(), title: title.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleAddMatch = async (match: (typeof matches)[number]) => {
    setSaving(true)
    try {
      // Catalog-linked add — no submission needed, it's already in the catalog
      await addFragranceToCollection({
        name: `${match.brand} - ${match.name}`,
        image_url: match.image_url,
        fragrance_id: match.id,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputClass = `rounded-2xl px-4 py-3 mt-2 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`

  // Tap-outside while typing means "dismiss the keyboard", not "throw away
  // everything I typed" — only a second tap with the keyboard down closes.
  const handleBackdropPress = () => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss()
      return
    }
    onClose()
  }

  return (
    // Centered card dialog, not pageSheet: RN's pageSheet is fullscreen on
    // Android and slides under the status bar (Cancel becomes untappable).
    // No statusBarTranslucent — it disables adjustResize on Android, leaving
    // the keyboard covering the card's lower half (KAV only handles iOS).
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className='flex-1'>
        <Pressable
          className='flex-1 items-center justify-center bg-black/50 px-6'
          onPress={handleBackdropPress}>
          {/* Pressable (not View) so taps inside don't bubble to the backdrop's close */}
          <Pressable
            className={`${modalColors.background} w-full max-w-md rounded-3xl px-5 pb-5`}
            onPress={() => {}}>
            <View className='flex-row items-center justify-between pt-4 pb-2'>
              <Text className={`${baseTextClass} text-lg font-bold`}>Add manually</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Text className={`${accentTextClass} text-base font-semibold`}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <Text className={`${mutedTextClass} text-sm pt-1`}>
              Can't find it in the catalog? Add it to your collection by hand.
            </Text>

            <Text className={`${baseTextClass} text-sm font-semibold pt-5`}>Brand</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder='e.g. Dior'
              placeholderTextColor={getColor(mutedColors)}
              autoCorrect={false}
              className={inputClass}
              style={{ color: getColor(baseColors) }}
            />

            <Text className={`${baseTextClass} text-sm font-semibold pt-4`}>Name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder='e.g. Sauvage Elixir'
              placeholderTextColor={getColor(mutedColors)}
              autoCorrect={false}
              className={inputClass}
              style={{ color: getColor(baseColors) }}
            />

            {matches.length > 0 && (
              <View className='pt-4'>
                <Text className={`${mutedTextClass} text-sm font-semibold`}>
                  Did you mean one of these?
                </Text>
                {matches.map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    disabled={saving}
                    onPress={() => handleAddMatch(match)}
                    className={`flex-row items-center rounded-2xl px-3 py-2 mt-2 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
                    <Card.Thumbnail imageUrl={match.image_url} compact />
                    <View className='flex-1'>
                      <Text className={`${baseTextClass} text-sm font-semibold`} numberOfLines={1}>
                        {match.name}
                      </Text>
                      <Text className={`${mutedTextClass} text-xs`} numberOfLines={1}>
                        {match.brand}
                      </Text>
                    </View>
                    <Text className={`${accentTextClass} text-sm font-semibold pl-2`}>Add</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={handleAdd}
              disabled={!canAdd}
              className={`${theme === "dark" ? "bg-emerald-500" : "bg-emerald-600"} mt-6 py-3 rounded-full items-center ${canAdd ? "" : "opacity-40"}`}>
              <Text className='text-white font-semibold'>
                {saving ? "Adding…" : "Add to collection"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default ManualAddModal
