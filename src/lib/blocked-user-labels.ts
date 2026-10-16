import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "blocked-user-labels"

export interface BlockedUserLabel {
  displayName: string | null
  avatarUrl: string | null
}

type LabelMap = Record<string, BlockedUserLabel>

// Device-local name/avatar snapshot taken at block time. The "public or own
// profile" RLS policy hides a blocked user's user_profiles row from the
// blocker, so the Blocked users list has no other way to show who a block is
// for. Best-effort: a block made on another device just shows a generic label.
export const readBlockedUserLabels = async (): Promise<LabelMap> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export const saveBlockedUserLabel = async (userId: string, label: BlockedUserLabel) => {
  const labels = await readBlockedUserLabels()
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...labels, [userId]: label }))
}

export const forgetBlockedUserLabel = async (userId: string) => {
  const { [userId]: _removed, ...rest } = await readBlockedUserLabels()
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
}
