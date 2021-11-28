import React, { useContext, useEffect, useState, createContext } from "react"
import * as Google from "expo-google-app-auth"
LogBox.ignoreAllLogs(true)
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from "@firebase/auth"
import config from "../lib/utils/googleAuthConfig"
import { auth, db } from "../lib/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  updateDoc,
} from "@firebase/firestore"
import { Alert, LogBox } from "react-native"
const AuthContext = createContext({})

const useAuth = () => {
  return useContext(AuthContext)
}
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userCollection, setUserCollection] = useState([])

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user)
        } else {
          setUser(null)
        }
      }),
    []
  )

  useEffect(
    () =>
      user &&
      onSnapshot(collection(db, "users", user.uid, "perfumes"), (doc) => {
        const perfumeObject = doc.docs.map((el) => el.data())
        setUserCollection(perfumeObject)
      }),
    [user]
  )

  const addFragranceToCollection = async (object) => {
    if (object.name.length < 3) {
      Alert.alert("Ooops", "The name must be 3 or more characters!")
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
      Alert.alert("Item added", `${object.name} has been added to your collection! `)
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
      Alert.alert(
        "Success",
        `The wear count of ${object.name} was incremented successfully! `
      )
    } catch (error) {
      console.log(error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const response = await Google.logInAsync(config)
      if (response.type === "success") {
        const { idToken, accessToken, user } = response
        const credential = GoogleAuthProvider.credential(idToken, accessToken)
        await signInWithCredential(auth, credential)
      }
    } catch (err) {
      console.log(err)
      setUser(null)
    }
  }
  const logOut = () => {
    signOut(auth)
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        signInWithGoogle,
        logOut,
        db,
        incrementWear,
        deleteFragrance,
        addFragranceToCollection,
        userCollection,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export default useAuth
