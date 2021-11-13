import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore/lite"
import { getAuth } from "firebase/auth"
import firebaseConfig from "./utils/firebaseConfig"


// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth()

export { db, auth }
