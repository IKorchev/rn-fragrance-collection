import * as ImagePicker from "expo-image-picker"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { File } from "expo-file-system"
import { supabase } from "./supabase"
import { reportError } from "./sentry"

const BUCKET = "profile-headers"

export type HeaderPhotoSource = "camera" | "library"

export type HeaderPhotoPick =
  | { status: "picked"; uri: string }
  | { status: "denied" }
  | { status: "canceled" }

export const pickHeaderPhoto = async (source: HeaderPhotoSource): Promise<HeaderPhotoPick> => {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return { status: "denied" }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"] }
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
  if (result.canceled || !result.assets[0]) return { status: "canceled" }
  return { status: "picked", uri: result.assets[0].uri }
}

// Downscales to header-background size before upload — a camera original can
// be 10MB+, far past the bucket's 3MB cap and pointless for a blurred-behind-
// the-avatar backdrop.
const compressForUpload = async (uri: string): Promise<string> => {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: 1280 }).renderAsync()
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 })
  return saved.uri
}

// Uploads to a fresh timestamped path (never overwrites — stale image caches
// can't survive a path change) and returns the new storage path. The caller
// persists it on user_profiles and then removes the previous object.
export const uploadHeaderPhoto = async (userId: string, localUri: string): Promise<string> => {
  const compressedUri = await compressForUpload(localUri)
  const bytes = await new File(compressedUri).bytes()
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg" })
  if (error) throw error
  return path
}

// Best-effort cleanup of a replaced/removed header object — an orphaned file
// costs pennies, so this never throws into UI flows.
export const removeHeaderPhotoObject = async (path: string) => {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) reportError(error, { flow: "profile-header-photo" })
}

export const headerPhotoUrl = (path: string | null | undefined): string | null =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null
