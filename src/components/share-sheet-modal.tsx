import React, { useState } from "react"
import { Switch, Text, View } from "react-native"
import useTheme from "@/contexts/theme-context"
import useLocale from "@/contexts/locale-context"
import useToast from "@/contexts/toast-context"
import { getColor } from "@/lib/utils/colors"
import { reportError } from "@/lib/sentry"
import { shareText } from "@/lib/share"
import Dialog from "@/components/shared/ui/dialog"
import Button from "@/components/shared/ui/button"

export interface ShareToggle {
  key: string
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

interface ShareSheetModalProps {
  visible: boolean
  title: string
  // Precomputed by the caller (share.ts builders) — recalculated there
  // whenever a toggle flips, so this component stays a dumb preview + send.
  message: string
  // Personal-data opt-ins (times worn / rating) — omitted entirely when the
  // caller has nothing optional to offer (e.g. the picker-result share).
  toggles?: ShareToggle[]
  onClose: () => void
}

// Shared "preview before you send" shell for every share entry point
// (fragrance detail, today's scent, picker result, profile recap) — the
// exact text is always shown before Share.share() fires, so the user always
// sees precisely what's about to leave the app.
const ShareSheetModal = ({ visible, title, message, toggles, onClose }: ShareSheetModalProps) => {
  const { baseTextClass, mutedTextClass, baseBorderClass, accentColors } = useTheme()
  const { t } = useLocale()
  const { showToast } = useToast()
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    try {
      await shareText(message)
      onClose()
    } catch (error) {
      reportError(error, { flow: "share" })
      showToast({ message: t("share.failedMessage") })
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog visible={visible} title={title} onClose={onClose} cancelLabel={t("common.cancel")}>
      <Text
        className={`${mutedTextClass} text-xs font-semibold uppercase pt-3 pb-1`}
        accessibilityRole='text'>
        {t("share.previewLabel")}
      </Text>
      <View className={`rounded-2xl border ${baseBorderClass} p-3`}>
        <Text className={`${baseTextClass} text-sm leading-5`}>{message}</Text>
      </View>

      {toggles?.map((toggle) => (
        <View key={toggle.key} className='flex-row items-center justify-between pt-4'>
          <Text className={`${baseTextClass} text-sm flex-1 pr-3`}>{toggle.label}</Text>
          <Switch
            value={toggle.value}
            onValueChange={toggle.onChange}
            trackColor={{ true: getColor(accentColors) }}
            accessibilityRole='switch'
            accessibilityLabel={toggle.label}
          />
        </View>
      ))}

      <Button
        variant='primary'
        label={t("share.action")}
        loading={sharing}
        className='mt-5'
        onPress={handleShare}
        testID='share-sheet-confirm'
      />
    </Dialog>
  )
}

export default ShareSheetModal
