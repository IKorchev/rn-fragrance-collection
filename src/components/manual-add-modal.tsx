import React, { useEffect, useState } from "react"
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"

interface ManualAddModalProps {
  visible: boolean
  // Prefill for the title field (e.g. the search term that found nothing)
  initialTitle?: string
  onClose: () => void
}

// Catalog gap escape hatch: add a fragrance by hand (brand + name, no image).
// The row gets no fragrance_id FK — same shape as legacy pre-catalog rows.
const ManualAddModal = ({ visible, initialTitle, onClose }: ManualAddModalProps) => {
  const { theme, modalColors, baseTextClass, mutedTextClass, accentTextClass, baseColors, mutedColors } =
    useTheme()
  const { addFragranceToCollection } = useAuth()
  const [brand, setBrand] = useState("")
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setBrand("")
      setTitle(initialTitle ?? "")
    }
  }, [visible, initialTitle])

  const canAdd = brand.trim().length > 0 && title.trim().length > 0 && !saving

  const handleAdd = async () => {
    setSaving(true)
    try {
      // Stored as the app-wide "Brand - Title" convention
      await addFragranceToCollection({
        name: `${brand.trim()} - ${title.trim()}`,
        image_url: null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputClass = `rounded-2xl px-4 py-3 mt-2 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={onClose}>
      <View className={`${modalColors.background} flex-1 px-5`}>
        <View className='flex-row items-center justify-between pt-4 pb-2'>
          <Text className={`${baseTextClass} text-lg font-bold`}>Add manually</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text className={`${accentTextClass} text-base font-semibold`}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <Text className={`${mutedTextClass} text-sm pt-2`}>
          Can't find it in the catalog? Add it to your collection by hand.
        </Text>

        <Text className={`${baseTextClass} text-sm font-semibold pt-6`}>Brand</Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder='e.g. Dior'
          placeholderTextColor={getColor(mutedColors)}
          autoCorrect={false}
          className={inputClass}
          style={{ color: getColor(baseColors) }}
        />

        <Text className={`${baseTextClass} text-sm font-semibold pt-5`}>Name</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder='e.g. Sauvage Elixir'
          placeholderTextColor={getColor(mutedColors)}
          autoCorrect={false}
          className={inputClass}
          style={{ color: getColor(baseColors) }}
        />

        <TouchableOpacity
          onPress={handleAdd}
          disabled={!canAdd}
          className={`${theme === "dark" ? "bg-emerald-500" : "bg-emerald-600"} mt-8 py-3 rounded-full items-center ${canAdd ? "" : "opacity-40"}`}>
          <Text className='text-white font-semibold'>
            {saving ? "Adding…" : "Add to collection"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

export default ManualAddModal
