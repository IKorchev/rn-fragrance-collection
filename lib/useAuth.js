import React, { useContext, useEffect, useState } from "react"
import * as Google from "expo-google-app-auth"

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from "@firebase/auth"
import config from "./utils/googleAuthConfig"
import { auth, db } from "./firebase"
const AuthContext = React.createContext({})

const useAuth = () => {
  return useContext(AuthContext)
}
export const AuthProvider = ({ children }) => {
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

  const [user, setUser] = useState(null)
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
    <AuthContext.Provider value={{ user, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export default useAuth
