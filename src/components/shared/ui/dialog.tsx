import React, { type ReactNode } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import useTheme from "@/contexts/theme-context"

interface DialogProps {
  visible: boolean
  title: string
  onClose: () => void
  cancelLabel?: string
  children: ReactNode
}

// Centered card dialog shell (not pageSheet: RN's pageSheet is fullscreen on
// Android and slides under the status bar, making Cancel untappable — see
// FilterPickerModal for the pageSheet shape instead, used for full pickers).
// No statusBarTranslucent — it disables Android's adjustResize, leaving the
// keyboard covering the card's lower half (KeyboardAvoidingView only handles
// iOS here).
const Dialog = ({ visible, title, onClose, cancelLabel = "Cancel", children }: DialogProps) => {
  const { modalColors, baseTextClass, accentTextClass } = useTheme()

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
              <Text className={`${baseTextClass} text-lg font-bold`}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Text className={`${accentTextClass} text-base font-semibold`}>{cancelLabel}</Text>
              </TouchableOpacity>
            </View>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default Dialog
