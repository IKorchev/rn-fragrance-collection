import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { getTop100 } from "../lib/utils/fetchData"
import useAuth from "./AuthContext"
import { random } from "lodash"
const DataContext = createContext("")

const useData = () => {
  return useContext(DataContext)
}

export const DataContextProvider = ({ children }) => {
  const { userCollection, setFrag } = useAuth()
  const [data, setData] = useState(null)
  const [top100, setTop100] = useState(null)
  const [index, setIndex] = useState()
  const getNewFrag = () => {
    const max = userCollection.length - 1
    let index = random(0, max)
    setFrag(userCollection[index])
    setIndex(index)
  }

  const handleData = async () => {
    const topMen = await getTop100("Men")
    setTop100({ men: topMen, women: [], unisex: [] })
    const topWomen = await getTop100("Women")
    setTop100({ men: topMen, women: topWomen, unisex: [] })
    const topUnisex = await getTop100("Unisex")
    setTop100({ men: topMen, women: topWomen, unisex: topUnisex })
  }
  useEffect(() => {
    if (userCollection.length >= 1) {
      getNewFrag()
      console.log("running")
    }
  }, [userCollection.length])
  useEffect(() => {
    getNewFrag()
    handleData()
  }, [])

  const obj = {
    getNewFrag,
    top100,
    setData,
    data,
    index,
  }
  return <DataContext.Provider value={obj}>{children}</DataContext.Provider>
}

export default useData
