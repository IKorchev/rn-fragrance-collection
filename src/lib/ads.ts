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

let interstitial: InterstitialAd | null = null
let loaded = false
let initStarted = false

// (Re)create and start loading an interstitial so it's ready by the time the
// picker closes. Interstitials are single-use: a fresh one is loaded after
// each show (CLOSED) and after load failures via the next showInterstitial().
const preload = () => {
  interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId!)
  loaded = false
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true
  })
  // On error the SDK resets its internal load state, so the next
  // showInterstitial() can retry load() cleanly
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false
  })
  interstitial.addAdEventListener(AdEventType.CLOSED, preload)
  interstitial.load()
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

  // Don't request the first ad until the SDK is actually up — loading during
  // initialization surfaces as spurious network errors
  await mobileAds().initialize()
  preload()
}

// Show the interstitial if one is ready — silently does nothing when ads are
// disabled, still loading, or failed to load (never block the UX on an ad).
// Returns whether an ad was actually shown.
export const showInterstitial = () => {
  if (!adsEnabled || !interstitial) return false
  if (!loaded) {
    // A failed load never fires CLOSED, so re-arm for next time (no-op while
    // a load is already in flight — the SDK guards duplicates)
    interstitial.load()
    return false
  }
  loaded = false
  interstitial.show()
  return true
}
