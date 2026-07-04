import React, { useContext, useEffect, useState, createContext } from "react"
import * as Google from "expo-auth-session/providers/google"
import * as WebBrowser from "expo-web-browser"
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from "firebase/auth"

import { auth, db } from "../lib/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  updateDoc,
} from "firebase/firestore"
import { Alert } from "react-native"

WebBrowser.maybeCompleteAuthSession()

const AuthContext = createContext({})

const useAuth = () => {
  return useContext(AuthContext)
}
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userCollection, setUserCollection] = useState([])
  const [sortedCollection, setSortedCollection] = useState([])

  const [frag, setFrag] = useState()

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user ?? null)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    return onSnapshot(collection(db, "users", user.uid, "perfumes"), (doc) => {
      const col = doc.docs.map((el) => el.data())
      const sortedCollection = col.sort((el1, el2) => el1.times_worn < el2.times_worn)
      setUserCollection(col)
      setSortedCollection(sortedCollection)
    })
  }, [user])

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params
      const credential = GoogleAuthProvider.credential(id_token, access_token)
      signInWithCredential(auth, credential).catch((err) => {
        console.log(err)
        setUser(null)
      })
    }
  }, [response])

  const addFragranceToCollection = async (object) => {
    if (object.name.length < 3) {
      Alert.alert("Ooops", "The name must be 3 or more characters!")
      return
    }
    if (userCollection.find((el) => el.name === object.name)) {
      Alert.alert("Ooops", `You already have ${object.name} in your collection`)
      return
    }


    try {
      const colRef = collection(db, "users", user.uid, "perfumes")
      const response = await addDoc(colRef, object)
      const docRef = doc(colRef, response.id)
      await updateDoc(docRef, {
        ...object,
        times_worn: 0,
        id: response.id,
      })
      Alert.alert("Item added successfully", `${object.name}`)
    } catch (error) {
      Alert.alert("Item was not added", "Something went wrong, please try again later.")
      console.log(error)
    }
  }
  const deleteFragrance = async (object) => {
    try {
      const ref = collection(db, "users", user.uid, "perfumes")
      const docRef = doc(ref, object.id)
      await deleteDoc(docRef)
    } catch (err) {
      console.log(err)
    }
  }

  const incrementWear = async (object) => {
    try {
      const ref = collection(db, "users", user.uid, "perfumes")
      const docRef = doc(ref, object.id)
      await updateDoc(docRef, {
        ...object,
        times_worn: increment(1),
      })
    } catch (error) {
      Alert.alert("Oops", `Something went wrong!`)
    }
  }

  const signInWithGoogle = () => promptAsync()

  const logOut = () => {
    signOut(auth)
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        signInWithGoogle,
        logOut,
        db,
        incrementWear,
        deleteFragrance,
        addFragranceToCollection,
        userCollection,
        sortedCollection,
        frag,
        setFrag,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export default useAuth
