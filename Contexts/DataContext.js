import React, { createContext, useContext, useEffect, useState } from "react"
import { getTop100 } from "../lib/utils/fetchData"

const DataContext = createContext("")

const useData = () => {
  return useContext(DataContext)
}

export const DataContextProvider = ({ children }) => {
  const [data, setData] = useState(null)
  const [top100, setTop100] = useState(null)

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
      }}>
      {children}
    </DataContext.Provider>
  )
}

export default useData
