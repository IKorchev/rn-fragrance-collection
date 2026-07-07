import type { ImageSourcePropType } from "react-native"

// Scraped image_url values can be null/empty/garbage — only http(s) or
// protocol-relative URLs become a usable RN image source
export const getImageSource = (value: string | null | undefined): ImageSourcePropType | null => {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  return /^(https?:)?\/\//i.test(trimmed) ? { uri: trimmed } : null
}
