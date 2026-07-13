import mobileAds, { AdEventType, InterstitialAd, TestIds } from "react-native-google-mobile-ads"

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

export const initializeAds = () => {
  if (!adsEnabled || initStarted) return
  initStarted = true
  // Don't request the first ad until the SDK is actually up — loading during
  // initialization surfaces as spurious network errors
  mobileAds()
    .initialize()
    .then(preload)
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
