import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
  type ReactNode,
} from "react"
import * as Google from "expo-auth-session/providers/google"
import * as WebBrowser from "expo-web-browser"
import { Alert, Platform } from "react-native"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"
import { registerForPushNotificationsAsync } from "@/lib/notifications"
import { pickWeightedIndex } from "@/lib/utils/pick-weighted-index"
import type { Tables } from "@/lib/database.types"

WebBrowser.maybeCompleteAuthSession()

export type UserFragrance = Tables<"user_fragrances">

export type AppUser = User & { photoURL?: string }

// What the add/delete/edit flows pass around — a full row for collection
// items, or just name/image for items coming from search/top-100/catalog.
export interface FragranceInput {
  id?: string
  name: string
  image_url: string | null
}

interface AuthContextValue {
  user: AppUser | null
  authLoading: boolean
  signInWithGoogle: () => void
  logOut: () => void
  incrementWear: (object: { id: string }) => Promise<void>
  requestDelete: (object: { id: string }) => void
  cancelDelete: (id: string) => void
  updateFragrance: (
    object: { id: string },
    updates: Partial<Pick<UserFragrance, "name" | "image_url">>
  ) => Promise<void>
  addFragranceToCollection: (object: FragranceInput) => Promise<void>
  userCollection: UserFragrance[]
  sortedCollection: UserFragrance[]
  visibleSortedCollection: UserFragrance[]
  frag: UserFragrance | undefined
  setFrag: React.Dispatch<React.SetStateAction<UserFragrance | undefined>>
  getNewFrag: (targetIndex?: number) => void
  index: number | undefined
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

const useAuth = () => {
  return useContext(AuthContext)
}

// Supabase stores the Google avatar in user_metadata; expose it as photoURL so
// consumers keep the same shape they had with Firebase (see Header.tsx).
const toAppUser = (sessionUser: User | null | undefined): AppUser | null =>
  sessionUser ? { ...sessionUser, photoURL: sessionUser.user_metadata?.avatar_url } : null

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const deleteTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // The currently "picked" fragrance + its index in userCollection
  const [frag, setFrag] = useState<UserFragrance | undefined>()
  const [index, setIndex] = useState<number | undefined>()

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(toAppUser(session?.user))
      setAuthLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user))
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const { data: collectionData } = useQuery({
    queryKey: ["collection", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserFragrance[]> => {
      const { data, error } = await supabase
        .from("user_fragrances")
        .select("*")
        .eq("user_id", user!.id)
      if (error) throw error
      return data ?? []
    },
  })
  const userCollection = collectionData ?? []
  const sortedCollection = [...userCollection].sort((el1, el2) => el1.times_worn - el2.times_worn)

  const invalidateCollection = () =>
    queryClient.invalidateQueries({ queryKey: ["collection", user?.id] })

  // Realtime keeps other devices in sync; local writes also invalidate directly
  // so the UI never depends on the channel being up.
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`user_fragrances:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_fragrances", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["collection", user.id] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Register this device for push and remember its Expo token. Upserting on
  // the token re-homes it if a different account signs in on the same device.
  useEffect(() => {
    if (!user?.id) return
    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return
      const { error } = await supabase
        .from("user_push_tokens")
        .upsert(
          {
            user_id: user.id,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        )
      if (error) console.log("Failed to save push token", error)
    })
  }, [user?.id])

  const getNewFrag = (targetIndex?: number) => {
    const max = userCollection.length - 1
    let nextIndex = targetIndex

    if (typeof nextIndex !== "number" || nextIndex < 0 || nextIndex > max) {
      nextIndex = pickWeightedIndex(userCollection)
    }

    setFrag(userCollection[nextIndex])
    setIndex(nextIndex)
  }

  useEffect(() => {
    if (userCollection.length >= 1) {
      getNewFrag()
    }
  }, [userCollection.length])

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params
      supabase.auth
        .signInWithIdToken({ provider: "google", token: id_token, access_token })
        .then(({ error }) => {
          if (error) {
            console.log(error)
            Alert.alert("Sign in failed", "Something went wrong, please try again.")
          }
        })
    }
  }, [response])

  const addFragranceToCollection = async (object: FragranceInput) => {
    if (object.name.length < 3) {
      Alert.alert("Ooops", "The name must be 3 or more characters!")
      return
    }
    if (userCollection.find((el) => el.name === object.name)) {
      Alert.alert("Ooops", `You already have ${object.name} in your collection`)
      return
    }

    try {
      const { error } = await supabase.from("user_fragrances").insert({
        user_id: user!.id,
        name: object.name,
        image_url: object.image_url,
        times_worn: 0,
      })
      if (error) throw error
      await invalidateCollection()
      Alert.alert("Item added successfully", `${object.name}`)
    } catch (error) {
      Alert.alert("Item was not added", "Something went wrong, please try again later.")
      console.log(error)
    }
  }

  const performDelete = async (object: { id: string }) => {
    try {
      const { error } = await supabase.from("user_fragrances").delete().eq("id", object.id)
      if (error) throw error
      await invalidateCollection()
    } catch (err) {
      Alert.alert("Delete failed", "Something went wrong, please try again later.")
      console.log(err)
    }
  }

  // Deletion is deferred so the caller can show an "Undo" toast — the database
  // delete only actually happens once the timeout fires without cancelDelete().
  const requestDelete = (object: { id: string }) => {
    setPendingDeleteIds((prev) => (prev.includes(object.id) ? prev : [...prev, object.id]))
    deleteTimeouts.current[object.id] = setTimeout(() => {
      delete deleteTimeouts.current[object.id]
      setPendingDeleteIds((prev) => prev.filter((id) => id !== object.id))
      performDelete(object)
    }, 4000)
  }

  const cancelDelete = (id: string) => {
    clearTimeout(deleteTimeouts.current[id])
    delete deleteTimeouts.current[id]
    setPendingDeleteIds((prev) => prev.filter((pid) => pid !== id))
  }

  const updateFragrance = async (
    object: { id: string },
    updates: Partial<Pick<UserFragrance, "name" | "image_url">>
  ) => {
    try {
      const { error } = await supabase.from("user_fragrances").update(updates).eq("id", object.id)
      if (error) throw error
      await invalidateCollection()
    } catch (error) {
      Alert.alert("Update failed", "Something went wrong, please try again later.")
      console.log(error)
    }
  }

  const incrementWear = async (object: { id: string }) => {
    try {
      const { error } = await supabase.rpc("increment_wear", { row_id: object.id })
      if (error) throw error
      await invalidateCollection()
    } catch (error) {
      Alert.alert("Oops", `Something went wrong!`)
    }
  }

  const signInWithGoogle = () => {
    promptAsync()
  }

  const logOut = () => {
    supabase.auth.signOut()
  }

  const visibleSortedCollection = sortedCollection.filter(
    (el) => !pendingDeleteIds.includes(el.id)
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        signInWithGoogle,
        logOut,
        incrementWear,
        requestDelete,
        cancelDelete,
        updateFragrance,
        addFragranceToCollection,
        userCollection,
        sortedCollection,
        visibleSortedCollection,
        frag,
        setFrag,
        getNewFrag,
        index,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export default useAuth
