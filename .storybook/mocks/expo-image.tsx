import React from "react"
import { Image as RNImage, type ImageStyle, type StyleProp } from "react-native"

// expo-image is a native module: it resolves to raw TypeScript that pulls in
// expo-modules-core and a chain of CommonJS react-native-web internals Vite
// can't pre-bundle. Card.Thumbnail only needs something that draws an image,
// so Storybook renders react-native-web's own Image instead.
interface ImageProps {
  source?: { uri: string } | number | null
  style?: StyleProp<ImageStyle>
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down"
  transition?: number
  className?: string
}

const CONTENT_FIT_TO_RESIZE_MODE = {
  cover: "cover",
  contain: "contain",
  fill: "stretch",
  none: "center",
  "scale-down": "contain",
} as const

export const Image = ({ source, style, contentFit = "cover", className }: ImageProps) => {
  if (!source) return null

  return (
    <RNImage
      source={source as never}
      style={style}
      resizeMode={CONTENT_FIT_TO_RESIZE_MODE[contentFit]}
      className={className}
    />
  )
}

export default { Image }
