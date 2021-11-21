import React, { createContext, useContext, useState } from "react"

const ThemeContext = createContext("")

const useTheme = () => {
  return useContext(ThemeContext)
}

export const ThemeContextProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark")

  const headerColors = {
    font: theme === "dark" ? "text-green-300" : "text-black",
    background: theme === "dark" ? "bg-gray-900" : "bg-white",
  }
  const modalColors = {
    font: theme === "dark" ? "text-white" : "text-black",
    background: theme === "dark" ? "bg-gray-800" : "bg-white",
  }
  const viewColors = {
    font: theme === "dark" ? "text-white" : "text-black",
    background: theme === "dark" ? "bg-gray-800" : "",
  }
  const cardColors = {
    font: theme === "dark" ? "text-white" : "text-black",
    background: theme === "dark" ? "bg-gray-600" : "bg-white",
  }

  return (
    <ThemeContext.Provider
      value={{
        viewColors,
        headerColors,
        theme,
        cardColors,
        modalColors,
        setTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default useTheme
