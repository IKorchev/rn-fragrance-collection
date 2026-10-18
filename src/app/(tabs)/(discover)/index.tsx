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
// one iOS segmented control. Search is its own tab (role="search"). The
// control is passed down as the list header of whichever view is showing: the
// large-title header is laid over the screen, so a View above the list would
// sit hidden behind the title.
const DiscoverScreen = () => {
  const [view, setView] = useState<DiscoverView>("top")
  const { viewColors } = useTheme()
  const { t } = useLocale()

  const segmentedControl = (
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
  )

  return (
    <View className={`${viewColors.background} flex-1`}>
      {view === "top" ? <DiscoverTop header={segmentedControl} /> : <DiscoverForYou header={segmentedControl} />}
    </View>
  )
}

export default DiscoverScreen
