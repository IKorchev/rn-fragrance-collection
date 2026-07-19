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

export type HeaderPhotoUpload = { status: "uploaded"; path: string } | { status: "rejected" }

// Uploads go through the upload-header-photo edge function — it NSFW-scans
// the image and only then stores it (the bucket has no client INSERT
// policy), updates user_profiles.header_image_path, and sweeps older objects
// itself, so the caller only needs to refetch the profile row. "rejected"
// means the scan said no — surface that distinctly from a technical failure.
export const uploadHeaderPhoto = async (localUri: string): Promise<HeaderPhotoUpload> => {
  const compressedUri = await compressForUpload(localUri)
  const image = await new File(compressedUri).base64()
  const { data, error } = await supabase.functions.invoke("upload-header-photo", {
    body: { image },
  })
  if (error) throw error
  if (data?.ok) return { status: "uploaded", path: data.path }
  if (data?.reason === "rejected") return { status: "rejected" }
  throw new Error(`Header photo upload failed: ${data?.reason ?? "unknown"}`)
}

// Best-effort cleanup of a replaced/removed header object — an orphaned file
// costs pennies, so this never throws into UI flows.
export const removeHeaderPhotoObject = async (path: string) => {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) reportError(error, { flow: "profile-header-photo" })
}

export const headerPhotoUrl = (path: string | null | undefined): string | null =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null
