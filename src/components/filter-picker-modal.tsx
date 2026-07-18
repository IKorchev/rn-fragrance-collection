import React from "react"
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { AntDesign } from "@expo/vector-icons"
import { getColor } from "@/lib/utils/colors"
import useTheme from "@/contexts/theme-context"
import SearchField from "@/components/shared/ui/search-field"

export interface FilterOption {
  value: string
  count: number
}

interface FilterPickerModalProps {
  visible: boolean
  title: string
  options: FilterOption[]
  loading: boolean
  searchValue: string
  onSearchChange: (text: string) => void
  multiSelect: boolean // false: picking closes the modal; true: toggle + Done
  selected: string[]
  onToggle: (value: string) => void
  onClear?: () => void
  onClose: () => void
}

const FilterPickerModal = ({
  visible,
  title,
  options,
  loading,
  searchValue,
  onSearchChange,
  multiSelect,
  selected,
  onToggle,
  onClear,
  onClose,
}: FilterPickerModalProps) => {
  const { modalColors, baseTextClass, mutedTextClass, accentTextClass, accentColors, baseBorderClass } =
    useTheme()

  const handlePick = (value: string) => {
    onToggle(value)
    if (!multiSelect) onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}>
      {/* pageSheet renders full-screen under the status bar on Android (see
          Dialog.tsx's note on the same quirk) — without this, the header
          (and its only close affordance) sits behind the status bar */}
      <SafeAreaView edges={["top", "bottom"]} className={`${modalColors.background} flex-1`}>
        <View className={`${baseBorderClass} flex-row items-center justify-between px-4 pt-4 pb-2`}>
          <Text className={`${baseTextClass} text-lg font-bold`}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text className={`${accentTextClass} text-base font-semibold`}>Done</Text>
          </TouchableOpacity>
        </View>
        <View className='px-4 pb-2'>
          <SearchField
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={`Search ${title.toLowerCase()}`}
          />
        </View>
        {loading && options.length === 0 ? (
          <ActivityIndicator size='large' color={getColor(accentColors)} className='mt-12' />
        ) : (
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps='handled'
            ListHeaderComponent={
              onClear && selected.length > 0 ? (
                <TouchableOpacity className='px-5 py-3' onPress={onClear}>
                  <Text className={`${accentTextClass} font-semibold`}>Clear selection</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <Text className={`${mutedTextClass} text-center mt-12`}>No matches.</Text>
            }
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.value)
              return (
                <TouchableOpacity
                  className='flex-row items-center justify-between px-5 py-3'
                  onPress={() => handlePick(item.value)}>
                  <Text
                    className={`${isSelected ? accentTextClass : baseTextClass} flex-1 pr-3`}
                    numberOfLines={1}>
                    {item.value}
                  </Text>
                  <Text className={`${mutedTextClass} text-xs`}>{item.count}</Text>
                  {isSelected && (
                    <AntDesign
                      name='check'
                      size={16}
                      color={getColor(accentColors)}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
              )
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  )
}

export default FilterPickerModal
