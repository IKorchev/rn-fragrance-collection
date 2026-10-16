import React, { type ReactNode } from "react"
import { type StyleProp, type ViewStyle } from "react-native"
import MenuView, { type MenuAction } from "@expo/ui/community/menu"
import useTheme from "@/contexts/theme-context"

export interface NativeMenuItem {
  id: string
  title: string
  // SF Symbol name; iOS only, Android menus render text-only items
  icon?: MenuAction["image"]
  destructive?: boolean
  disabled?: boolean
  // Renders a checkmark: for single-choice menus (sort order, appearance)
  checked?: boolean
  onPress: () => void
}

interface NativeMenuProps {
  // iOS only: shown as a section header at the top of the menu
  title?: string
  items: NativeMenuItem[]
  style?: StyleProp<ViewStyle>
  testID?: string
  // The trigger. Must not be pressable itself: the menu owns the tap, and a
  // nested Pressable would swallow it
  children: ReactNode
}

// The platform's own pop-up menu anchored to its trigger: SwiftUI Menu on iOS
// (Liquid Glass on iOS 26), Material 3 DropdownMenu on Android. Use this
// instead of Alert.alert button lists for a set of actions on one control.
const NativeMenu = ({ title, items, style, testID, children }: NativeMenuProps) => {
  const { theme } = useTheme()

  return (
    <MenuView
      title={title}
      colorScheme={theme}
      style={style}
      testID={testID}
      actions={items.map((item) => ({
        id: item.id,
        title: item.title,
        image: item.icon,
        state: item.checked ? "on" : undefined,
        attributes: { destructive: item.destructive, disabled: item.disabled },
      }))}
      onPressAction={({ nativeEvent }) => items.find((item) => item.id === nativeEvent.event)?.onPress()}>
      {children}
    </MenuView>
  )
}

export default NativeMenu
