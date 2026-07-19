// The ONLY write path into the profile-headers bucket (the client INSERT
// storage policy was dropped — see migration header_photo_upload_via_edge_fn):
// verifies the JWT, scans the image for NSFW content, and only then uploads
// with the service role + swaps user_profiles.header_image_path. Scan
// failures fail CLOSED: an unscannable image is never stored.
//
// The scan replicates nsfwjs@4.3.0's MobileNetV2 inference (toFloat/255 →
// resizeBilinear 224 alignCorners → predict; classes indexed alphabetically)
// on the slim tfjs packages — the nsfwjs npm package itself (and the
// @tensorflow/tfjs union package it drags in) inlines ~40MB of sources and
// breaks the function deploy bundler. Weights load once per isolate
// (~160ms) from the version-pinned jsdelivr mirror of the nsfwjs repo;
// measured inference is ~1.2s on the CPU backend.
// Client contract: POST { image: <base64 jpeg> } → 200 with
// { ok: true, path } | { ok: false, reason: "rejected" | "invalid_image" }.
import { createClient } from "npm:@supabase/supabase-js@2"
import * as tf from "npm:@tensorflow/tfjs-core@4.22.0"
import { loadLayersModel, type LayersModel } from "npm:@tensorflow/tfjs-layers@4.22.0"
import "npm:@tensorflow/tfjs-backend-cpu@4.22.0"
import jpeg from "npm:jpeg-js@0.4.4"

const MAX_BYTES = 3 * 1024 * 1024
const MODEL_URL = "https://cdn.jsdelivr.net/gh/infinitered/nsfwjs@4.3.0/models/mobilenet_v2/model.json"
const NSFW_CLASSES = ["Drawing", "Hentai", "Neutral", "Porn", "Sexy"] as const

let modelPromise: Promise<LayersModel> | null = null
const getModel = () => (modelPromise ??= loadLayersModel(MODEL_URL))

// "Sexy" (suggestive but clothed) gets a looser threshold than the explicit
// classes — bottle photos on skin-toned backgrounds shouldn't trip it.
const isRejected = (p: Record<string, number>) =>
  (p.Porn ?? 0) >= 0.55 || (p.Hentai ?? 0) >= 0.55 || (p.Sexy ?? 0) >= 0.8

const decodeBase64 = (input: string): Uint8Array => {
  const binary = atob(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const classifyJpeg = async (bytes: Uint8Array): Promise<Record<string, number>> => {
  const decoded = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 128 })
  const numPixels = decoded.width * decoded.height
  const values = new Int32Array(numPixels * 3)
  for (let i = 0; i < numPixels; i++) {
    values[i * 3] = decoded.data[i * 4]
    values[i * 3 + 1] = decoded.data[i * 4 + 1]
    values[i * 3 + 2] = decoded.data[i * 4 + 2]
  }
  await tf.ready()
  const model = await getModel()
  const probs = tf.tidy(() => {
    const input = tf.tensor3d(values, [decoded.height, decoded.width, 3], "int32")
    const normalized = tf.div(tf.cast(input, "float32"), 255)
    const resized = tf.image.resizeBilinear(normalized as tf.Tensor3D, [224, 224], true)
    const batched = tf.reshape(resized, [1, 224, 224, 3])
    return model.predict(batched) as tf.Tensor
  })
  try {
    const data = await probs.data()
    return Object.fromEntries(NSFW_CLASSES.map((className, i) => [className, data[i]]))
  } finally {
    probs.dispose()
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "")
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)
  if (userError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let base64: unknown
  try {
    base64 = (await req.json())?.image
  } catch {
    return Response.json({ ok: false, reason: "invalid_image" })
  }
  // 4/3 base64 overhead over the byte cap
  if (typeof base64 !== "string" || base64.length > (MAX_BYTES * 4) / 3 + 1024) {
    return Response.json({ ok: false, reason: "invalid_image" })
  }

  let bytes: Uint8Array
  try {
    bytes = decodeBase64(base64)
  } catch {
    return Response.json({ ok: false, reason: "invalid_image" })
  }
  // JPEG SOI marker — the bucket is JPEG-only and so is the scanner
  if (bytes.length > MAX_BYTES || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return Response.json({ ok: false, reason: "invalid_image" })
  }

  try {
    const probabilities = await classifyJpeg(bytes)
    if (isRejected(probabilities)) {
      console.log("Rejected header photo for", user.id, probabilities)
      return Response.json({ ok: false, reason: "rejected" })
    }
  } catch (scanError) {
    console.error("NSFW scan failed for", user.id, scanError)
    return Response.json({ error: "Scan failed" }, { status: 500 })
  }

  const path = `${user.id}/${Date.now()}.jpg`
  const { error: uploadError } = await admin.storage
    .from("profile-headers")
    .upload(path, bytes, { contentType: "image/jpeg" })
  if (uploadError) {
    console.error("Header photo upload failed for", user.id, uploadError)
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }

  const { error: profileError } = await admin
    .from("user_profiles")
    .upsert(
      { user_id: user.id, header_image_path: path, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
  if (profileError) {
    console.error("Header path update failed for", user.id, profileError)
    await admin.storage.from("profile-headers").remove([path])
    return Response.json({ error: "Upload failed" }, { status: 500 })
  }

  // Best-effort sweep of every older object in the folder (not just the one
  // the profile row pointed at) so replaced/orphaned photos don't pile up
  try {
    const { data: objects } = await admin.storage
      .from("profile-headers")
      .list(user.id, { limit: 100 })
    const stale = (objects ?? [])
      .map((o) => `${user.id}/${o.name}`)
      .filter((objectPath) => objectPath !== path)
    if (stale.length > 0) await admin.storage.from("profile-headers").remove(stale)
  } catch (cleanupError) {
    console.error("Stale header cleanup failed for", user.id, cleanupError)
  }

  return Response.json({ ok: true, path })
})
