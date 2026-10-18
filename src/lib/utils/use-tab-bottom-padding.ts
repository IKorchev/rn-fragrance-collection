import { Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// Bottom padding for a tab root's scroll content. On iOS those scroll views
// use contentInsetAdjustmentBehavior="automatic", which already insets the
// content by the floating tab bar + home indicator — so only a little
// breathing room is added on top (adding the bar height again left ~100pt of
// dead space under the last row). Android has no automatic inset, so it keeps
// the explicit safe-area padding plus `androidExtra`.
export const useTabBottomPadding = (androidExtra = 0) => {
  const insets = useSafeAreaInsets()
  return Platform.OS === "ios" ? 16 : insets.bottom + androidExtra
}

export default useTabBottomPadding
