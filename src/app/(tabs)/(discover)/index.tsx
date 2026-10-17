import React, { useState } from "react"
import { View } from "react-native"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import SegmentedControl from "@/components/shared/ui/segmented-control"
import DiscoverTop from "@/components/discover-top"
import DiscoverForYou from "@/components/discover-for-you"

type DiscoverView = "top" | "forYou"

// The app's landing tab: community rankings (Top, populated for everyone) and
// personal recommendations (For You, empty until there's a collection) behind
// one iOS segmented control. Search is its own tab (role="search").
const DiscoverScreen = () => {
  const [view, setView] = useState<DiscoverView>("top")
  const { viewColors } = useTheme()
  const { t } = useLocale()

  return (
    <View className={`${viewColors.background} flex-1`}>
      <View className='px-4 pt-2'>
        <SegmentedControl
          options={[
            { label: t("discover.tabs.top"), value: "top" as const, testID: "discover-segment-top" },
            { label: t("discover.tabs.forYou"), value: "forYou" as const, testID: "discover-segment-for-you" },
          ]}
          value={view}
          onChange={setView}
        />
      </View>
      {view === "top" ? <DiscoverTop /> : <DiscoverForYou />}
    </View>
  )
}

export default DiscoverScreen
