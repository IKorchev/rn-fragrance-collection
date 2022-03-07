import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import useAuth from "./AuthContext"
import { random } from "lodash"
import { collection, getDocs } from "firebase/firestore"
const DataContext = createContext("")
const useData = () => {
  return useContext(DataContext)
}

export const DataContextProvider = ({ children }) => {
  const options = ["men", "women", "unisex"]
  const { userCollection, setFrag, db } = useAuth()
  const [index, setIndex] = useState()
  const getNewFrag = () => {
    const max = userCollection.length - 1
    let index = random(0, max)
    setFrag(userCollection[index])
    setIndex(index)
  }

  useEffect(() => {
    if (userCollection.length >= 1) {
      getNewFrag()
    }
  }, [userCollection.length])

  useEffect(() => {
    getNewFrag()
  }, [])

  const getTop100 = async (query) => {
    const data = await getDocs(collection(db, query))
    const els = data.docs.map((el) => ({ id: el.id, ...el.data() }))
    return els
  }

  // fetch the data for top 100
  const data = useMemo(() => {
    let data = []
    options.forEach(async (el) => {
      const t100 = await getTop100(`top-${el}`)
      const _t100 = t100.sort((el1, el2) => el1.place > el2.place)
      data.push(_t100)
    })
    return data
  }, [])

  const obj = {
    getNewFrag,
    data,
    options,
    index,
  }
  return <DataContext.Provider value={obj}>{children}</DataContext.Provider>
}

export default useData
