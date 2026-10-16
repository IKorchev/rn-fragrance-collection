import AsyncStorage from "@react-native-async-storage/async-storage"
import mobileAds, {
  AdEventType,
  AdsConsent,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads"

// Dev builds always use Google's sample interstitial unit (guaranteed test
// fill, safe to click — clicking real ads on a dev device violates AdMob
// policy); release builds need the real unit id from .env. When it's unset
// there, ads are disabled entirely and every caller no-ops, mirroring
// src/lib/purchases.ts.
export const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID

export const adsEnabled = !!interstitialAdUnitId

// The picker is the daily ritual, so its interstitial is capped: never during
// a new account's first days, and at most once per interval. The last-shown
// time is persisted so relaunching the app doesn't reset the cap.
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000
const NEW_ACCOUNT_GRACE_MS = 3 * 24 * 60 * 60 * 1000
const MAX_AD_AGE_MS = 60 * 60 * 1000
const LAST_SHOWN_KEY = "ads:interstitial:last-shown-at"

let interstitial: InterstitialAd | null = null
let loadedAt: number | null = null
let sdkReady = false
let initStarted = false

const discard = () => {
  interstitial = null
  loadedAt = null
}

// Interstitials are single-use, so each show discards the object and the next
// eligible picker session loads a fresh one.
const load = () => {
  const ad = InterstitialAd.createForAdRequest(interstitialAdUnitId!)
  interstitial = ad
  loadedAt = null
  ad.addAdEventListener(AdEventType.LOADED, () => {
    if (interstitial === ad) loadedAt = Date.now()
  })
  ad.addAdEventListener(AdEventType.ERROR, () => {
    if (interstitial === ad) discard()
  })
  ad.load()
}

// Must be called after the root view mounts (not at module scope): the UMP
// consent form needs the host Activity to present into.
export const initializeAds = async () => {
  if (!adsEnabled || initStarted) return
  initStarted = true

  // UMP consent gate (GDPR): gatherConsent() shows Google's consent form
  // when the user's region requires one and resolves immediately with
  // NOT_REQUIRED elsewhere. No SDK start and no ad request until it allows.
  let canRequestAds = false
  try {
    canRequestAds = (await AdsConsent.gatherConsent()).canRequestAds
  } catch {
    // Offline/UMP outage — fall back to the verdict cached from a previous
    // session (false on a first run where consent is required)
    try {
      canRequestAds = (await AdsConsent.getConsentInfo()).canRequestAds
    } catch {
      return
    }
  }
  if (!canRequestAds) return

  await mobileAds().initialize()
  sdkReady = true
}

const frequencyCapAllows = async (accountCreatedAt: string | undefined) => {
  // Dev builds serve Google's test ad, and .maestro/flows/ads.yaml asserts it
  // appears on every run — the time-based cap is release-only
  if (__DEV__) return true
  if (
    accountCreatedAt &&
    Date.now() - new Date(accountCreatedAt).getTime() < NEW_ACCOUNT_GRACE_MS
  ) {
    return false
  }
  try {
    const lastShown = Number(await AsyncStorage.getItem(LAST_SHOWN_KEY))
    return !lastShown || Date.now() - lastShown >= MIN_INTERVAL_MS
  } catch {
    return false
  }
}

// Called when the picker opens. Requests an ad only when one could actually
// be shown on close, so capped sessions make no ad request at all; an ad left
// over from an earlier session is replaced once it's older than MAX_AD_AGE_MS.
export const prepareInterstitial = async (accountCreatedAt?: string) => {
  if (!adsEnabled || !sdkReady) return
  if (!(await frequencyCapAllows(accountCreatedAt))) return
  const stale = loadedAt !== null && Date.now() - loadedAt > MAX_AD_AGE_MS
  if (interstitial && !stale) return
  load()
}

// Shows the prepared interstitial if it has loaded and the cap still allows
// it — silently does nothing otherwise (never block the UX on an ad).
// Returns whether an ad was actually shown.
export const showInterstitial = async (accountCreatedAt?: string) => {
  if (!adsEnabled || !interstitial || loadedAt === null) return false
  if (!(await frequencyCapAllows(accountCreatedAt))) return false
  const ad = interstitial
  discard()
  AsyncStorage.setItem(LAST_SHOWN_KEY, String(Date.now())).catch(() => {})
  ad.show().catch(() => {})
  return true
}
