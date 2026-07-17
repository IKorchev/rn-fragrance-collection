import React, { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { useDebouncedValue } from "@/lib/utils/use-debounced-value"
import { useFragranceSearch, MIN_SEARCH_LENGTH } from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import Card from "@/components/card"
import Dialog from "@/components/shared/ui/dialog"
import TextField from "@/components/shared/ui/text-field"
import Button from "@/components/shared/ui/button"

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
  const { theme, baseTextClass, mutedTextClass } = useTheme()
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

  return (
    <Dialog visible={visible} title='Add manually' onClose={onClose}>
      <Text className={`${mutedTextClass} text-sm pt-1`}>
        Can't find it in the catalog? Add it to your collection by hand.
      </Text>

      <Text className={`${baseTextClass} text-sm font-semibold pt-5`}>Brand</Text>
      <TextField value={brand} onChangeText={setBrand} placeholder='e.g. Dior' autoCorrect={false} className='mt-2' />

      <Text className={`${baseTextClass} text-sm font-semibold pt-4`}>Name</Text>
      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder='e.g. Sauvage Elixir'
        autoCorrect={false}
        className='mt-2'
      />

      {matches.length > 0 && (
        <View className='pt-4'>
          <Text className={`${mutedTextClass} text-sm font-semibold`}>
            Did you mean one of these?
          </Text>
          {matches.map((match) => (
            <View
              key={match.id}
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
              <Card.ActionPill
                label='Add'
                disabled={saving}
                onPress={() => handleAddMatch(match)}
                className='ml-2'
              />
            </View>
          ))}
        </View>
      )}

      <Button
        label='Add to collection'
        onPress={handleAdd}
        disabled={!canAdd}
        loading={saving}
        loadingLabel='Adding…'
        className='mt-6'
      />
    </Dialog>
  )
}

export default ManualAddModal
