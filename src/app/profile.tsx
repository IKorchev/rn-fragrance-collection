import React, { useMemo, useState } from "react"
import { ScrollView, View, Text, TouchableOpacity, Switch, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Avatar } from "@rneui/themed"
import { getColor } from "@/lib/utils/colors"
import { supabase } from "@/lib/supabase"
import { useRemindersEnabled, useWearHistory } from "@/lib/queries"
import useTheme from "@/contexts/theme-context"
import useAuth from "@/contexts/auth-context"

const ProfileScreen = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { modalColors, baseTextClass, mutedTextClass, accentTextClass, baseBorderClass, theme } =
    useTheme()
  const { user, logOut, deleteAccount, userCollection } = useAuth()
  const { data: remindersEnabled } = useRemindersEnabled(user?.id)
  const { data: events } = useWearHistory(user?.id)
  const [deleting, setDeleting] = useState(false)

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "Anonymous"
  const totalWears = userCollection.reduce((sum, el) => sum + el.times_worn, 0)
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null

  // Wears this calendar month + current daily streak, from the personal wear
  // diary (same day semantics as the once-per-day wear cap: device-local days)
  const { monthWears, streak } = useMemo(() => {
    const now = new Date()
    const wornDays = new Set<string>()
    let monthWears = 0
    for (const event of events ?? []) {
      const date = new Date(event.worn_at)
      wornDays.add(date.toDateString())
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        monthWears++
      }
    }
    // A streak survives until a full day is missed — start counting from
    // today if worn, else from yesterday
    let streak = 0
    const cursor = new Date()
    if (!wornDays.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
    while (wornDays.has(cursor.toDateString())) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return { monthWears, streak }
  }, [events])

  const mostWorn = useMemo(() => {
    const top = [...userCollection].sort((a, b) => b.times_worn - a.times_worn)[0]
    return top && top.times_worn > 0 ? top : null
  }, [userCollection])

  const handleSignOut = () => {
    router.back()
    logOut()
  }

  // Optimistic — the switch flips immediately, reverts if the write fails
  const toggleReminders = async (value: boolean) => {
    queryClient.setQueryData(["reminder-prefs", user?.id], value)
    const { error } = await supabase
      .from("user_push_tokens")
      .update({ reminders_enabled: value })
      .eq("user_id", user!.id)
    if (error) {
      queryClient.setQueryData(["reminder-prefs", user?.id], !value)
      Alert.alert("Oops", "Couldn't update your reminder setting, please try again.")
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, collection, and wear history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteAccount()
              // Auth state flips to signed-out and the Protected stack swaps
              // to the sign-in screen — nothing left to dismiss here.
            } catch (error) {
              console.log(error)
              Alert.alert(
                "Deletion failed",
                "Something went wrong, please try again later."
              )
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const mutedIconColor = getColor(theme === "dark" ? "zinc-400" : "zinc-500")
  const dangerColor = getColor(theme === "dark" ? "rose-400" : "rose-600")
  const dangerTextClass = theme === "dark" ? "text-rose-400" : "text-rose-600"
  const dividerClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"

  return (
    <ScrollView
      className={`flex-1 ${modalColors.background}`}
      contentContainerClassName='px-5 pt-8 pb-12 items-center'
      showsVerticalScrollIndicator={false}>
      <Avatar
        size={96}
        rounded
        source={user?.photoURL ? { uri: user.photoURL } : undefined}
        icon={<MaterialCommunityIcons name='account' size={56} color={getColor("zinc-500")} />}
        containerStyle={{ backgroundColor: getColor(theme === "dark" ? "zinc-800" : "zinc-200") }}
      />

      <Text className={`${baseTextClass} text-2xl font-bold pt-4`}>{displayName}</Text>
      {user?.email && <Text className={`${mutedTextClass} text-base pt-1`}>{user.email}</Text>}
      {memberSince && (
        <Text className={`${mutedTextClass} text-sm pt-1`}>Member since {memberSince}</Text>
      )}

      <View className={`flex-row w-full mt-8 rounded-2xl border ${baseBorderClass}`}>
        <View className='flex-1 items-center py-4'>
          <Text className={`${accentTextClass} text-2xl font-bold`}>{userCollection.length}</Text>
          <Text className={`${mutedTextClass} text-sm pt-1`}>In collection</Text>
        </View>
        <View className={`w-px ${dividerClass}`} />
        <View className='flex-1 items-center py-4'>
          <Text className={`${accentTextClass} text-2xl font-bold`}>{totalWears}</Text>
          <Text className={`${mutedTextClass} text-sm pt-1`}>Total wears</Text>
        </View>
      </View>

      <View className={`flex-row w-full mt-4 rounded-2xl border ${baseBorderClass}`}>
        <View className='flex-1 items-center py-4'>
          <Text className={`${accentTextClass} text-2xl font-bold`}>{monthWears}</Text>
          <Text className={`${mutedTextClass} text-sm pt-1`}>This month</Text>
        </View>
        <View className={`w-px ${dividerClass}`} />
        <View className='flex-1 items-center py-4'>
          <Text className={`${accentTextClass} text-2xl font-bold`}>{streak}</Text>
          <Text className={`${mutedTextClass} text-sm pt-1`}>
            Day streak{streak === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      {mostWorn && (
        <Text className={`${mutedTextClass} text-sm pt-3`}>
          Most worn:{" "}
          <Text className={`${baseTextClass} font-semibold`}>
            {mostWorn.name.split(" - ").slice(1).join(" - ")}
          </Text>{" "}
          ({mostWorn.times_worn}x)
        </Text>
      )}

      <TouchableOpacity
        onPress={() => router.push("/wear-history")}
        className={`flex-row items-center w-full mt-6 px-4 py-3 rounded-2xl border ${baseBorderClass}`}>
        <MaterialCommunityIcons name='history' size={20} color={mutedIconColor} />
        <Text className={`${baseTextClass} text-base font-semibold pl-3 flex-1`}>Wear history</Text>
        <MaterialCommunityIcons name='chevron-right' size={22} color={mutedIconColor} />
      </TouchableOpacity>

      <View
        className={`flex-row items-center w-full mt-4 px-4 py-3 rounded-2xl border ${baseBorderClass}`}>
        <MaterialCommunityIcons name='bell-outline' size={20} color={mutedIconColor} />
        <Text className={`${baseTextClass} text-base font-semibold pl-3 flex-1`}>
          Daily wear reminder
        </Text>
        <Switch
          value={remindersEnabled ?? true}
          onValueChange={toggleReminders}
          trackColor={{ true: getColor(theme === "dark" ? "emerald-500" : "emerald-600") }}
        />
      </View>

      <TouchableOpacity
        onPress={() => router.push("/privacy-policy")}
        className={`flex-row items-center w-full mt-4 px-4 py-3 rounded-2xl border ${baseBorderClass}`}>
        <MaterialCommunityIcons name='shield-lock-outline' size={20} color={mutedIconColor} />
        <Text className={`${baseTextClass} text-base font-semibold pl-3 flex-1`}>
          Privacy Policy
        </Text>
        <MaterialCommunityIcons name='chevron-right' size={22} color={mutedIconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/terms")}
        className={`flex-row items-center w-full mt-4 px-4 py-3 rounded-2xl border ${baseBorderClass}`}>
        <MaterialCommunityIcons name='file-document-outline' size={20} color={mutedIconColor} />
        <Text className={`${baseTextClass} text-base font-semibold pl-3 flex-1`}>
          Terms & Conditions
        </Text>
        <MaterialCommunityIcons name='chevron-right' size={22} color={mutedIconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSignOut}
        className={`flex-row items-center justify-center w-full mt-8 py-3 rounded-2xl ${
          theme === "dark"
            ? "bg-rose-500/25 border border-rose-400/50"
            : "bg-rose-200/70 border border-rose-400/60"
        }`}>
        <MaterialCommunityIcons name='logout' size={20} color={dangerColor} />
        <Text className={`${dangerTextClass} text-base font-semibold pl-2`}>Sign out</Text>
      </TouchableOpacity>

      {/* App Store 5.1.1(v) / Play policy: account deletion must be in-app */}
      <TouchableOpacity onPress={handleDeleteAccount} disabled={deleting} className='mt-6 py-2'>
        <Text className={`${dangerTextClass} text-sm ${deleting ? "opacity-40" : ""}`}>
          {deleting ? "Deleting account…" : "Delete account"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

export default ProfileScreen
