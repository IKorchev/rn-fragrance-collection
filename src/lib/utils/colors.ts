import colors from "tailwindcss/colors"

type ColorScale = Record<string, string>

export const getColor = (token: string): string => {
  const [name, shade] = token.split("-")
  const scale = (colors as unknown as Record<string, ColorScale | string>)[name]
  if (typeof scale === "object" && shade && scale[shade]) return scale[shade]
  return token
}
