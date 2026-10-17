import React, { useState } from "react"
import { FlatList, Text, View } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getColor } from "@/lib/utils/colors"
import { reportError } from "@/lib/sentry"
import { useBlockedUsers, type BlockedUser } from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"
import useToast from "@/contexts/toast-context"
import useLocale from "@/contexts/locale-context"
import EmptyState from "@/components/shared/ui/empty-state"
import SkeletonList from "@/components/shared/ui/skeleton-list"
import Button from "@/components/shared/ui/button"

// Profile tab's "Blocked users" row — every user_blocks row the signed-in
// user owns, with Unblock. Blocking itself happens on user-profile.tsx.
const BlockedUsersScreen = () => {
  const insets = useSafeAreaInsets()
  const { theme, modalColors, baseTextClass, mutedTextClass, baseBorderClass, cardColors } = useTheme()
  const { user, unblockUser } = useAuth()
  const { showToast } = useToast()
  const { t, formatDate } = useLocale()
  const { data: blocks, isPending, error, refetch } = useBlockedUsers(user?.id)
  const [busyId, setBusyId] = useState<string | null>(null)

  const nameFor = (block: BlockedUser) => block.displayName || t("blockedUsers.unknownName")

  const handleUnblock = async (block: BlockedUser) => {
    setBusyId(block.blockedId)
    try {
      await unblockUser(block.blockedId)
      showToast({ message: t("blockedUsers.unblocked", { name: nameFor(block) }) })
    } catch (err) {
      reportError(err, { flow: "unblock-user" })
      showToast({ message: t("blockedUsers.unblockFailed") })
    } finally {
      setBusyId(null)
    }
  }

  if (isPending) {
    return (
      <View className={`flex-1 ${modalColors.background}`}>
        <SkeletonList count={3} />
      </View>
    )
  }

  return (
    <FlatList
      className={`flex-1 ${modalColors.background}`}
      data={blocks ?? []}
      keyExtractor={(item) => item.blockedId}
      contentContainerClassName='px-5 pt-4'
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      ListEmptyComponent={
        error ? (
          <EmptyState
            icon='alert-circle-outline'
            title={t("blockedUsers.errorTitle")}
            message={t("blockedUsers.errorMessage")}
            actionLabel={t("collectors.errorAction")}
            onAction={refetch}
          />
        ) : (
          <EmptyState
            icon='account-check-outline'
            title={t("blockedUsers.emptyTitle")}
            message={t("blockedUsers.emptyMessage")}
          />
        )
      }
      renderItem={({ item }) => (
        <View className={`flex-row items-center mb-3 p-3 rounded-2xl ${cardColors.background}`}>
          <Avatar
            size={40}
            rounded
            source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
            icon={<MaterialCommunityIcons name='account' size={24} color={getColor("zinc-500")} />}
            containerStyle={{ backgroundColor: getColor(theme === "dark" ? "zinc-800" : "zinc-200") }}
          />
          <View className='flex-1 px-3'>
            <Text className={`${baseTextClass} text-base font-semibold`} numberOfLines={1}>
              {nameFor(item)}
            </Text>
            <Text className={`${mutedTextClass} text-xs pt-0.5`}>
              {t("blockedUsers.blockedOn", {
                date: formatDate(new Date(item.createdAt), { dateStyle: "medium" }),
              })}
            </Text>
          </View>
          <Button
            variant='secondary'
            size='sm'
            fullWidth={false}
            label={t("blockedUsers.unblock")}
            loading={busyId === item.blockedId}
            loadingLabel={t("blockedUsers.unblocking")}
            disabled={busyId !== null}
            onPress={() => handleUnblock(item)}
          />
        </View>
      )}
    />
  )
}

export default BlockedUsersScreen
