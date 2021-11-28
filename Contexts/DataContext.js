import React, { createContext, useContext, useEffect, useState } from "react"
import { getTop100 } from "../lib/utils/fetchData"
import useAuth from "./AuthContext"
import { random } from "lodash"
const DataContext = createContext("")

const useData = () => {
  return useContext(DataContext)
}

export const DataContextProvider = ({ children }) => {
  const { userCollection } = useAuth()
  const [data, setData] = useState(null)
  const [top100, setTop100] = useState(null)
  const [prevIndex, setPrevIndex] = useState(null)
  const [fragrance, setFragrance] = useState(userCollection)
  const getNewFrag = () => {
    let index = random(0, userCollection.length - 1)
    if (index == prevIndex) {
      console.log(`${index} <<<>>> ${prevIndex}`)
      index = getNewFrag()
    }
    setPrevIndex(index)
    setFragrance(() => {
      const obj = {
        fragrancePicked: userCollection[index],
        index: index,
      }
      return obj
    })
    return index
  }
  useEffect(() => {
    getNewFrag()
  }, [])
  const handleData = async () => {
    const topMen = await getTop100("Men")
    setTop100({ men: topMen, women: [], unisex: [] })

    const topWomen = await getTop100("Women")
    setTop100({ men: topMen, women: topWomen, unisex: [] })

    const topUnisex = await getTop100("Unisex")
    setTop100({ men: topMen, women: topWomen, unisex: topUnisex })
  }
  useEffect(() => {
    handleData()
  }, [])

  return (
    <DataContext.Provider
      value={{
        data,
        setData,
        top100,
        getNewFrag,
        fragrance,
      }}>
      {children}
    </DataContext.Provider>
  )
}

export default useData
