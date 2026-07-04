import colors from "tailwindcss/colors"

export const getColor = (token) => {
  const [name, shade] = token.split("-")
  return colors[name]?.[shade] ?? token
}
