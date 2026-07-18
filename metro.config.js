const { getSentryExpoConfig } = require("@sentry/react-native/metro")
const { withNativeWind } = require("nativewind/metro")

// getSentryExpoConfig wraps expo/metro-config's getDefaultConfig with Sentry's
// debug-ID injection, which release source-map upload relies on to match a
// bundle back to its symbols — inert without the Sentry Expo config plugin
// below actually running (i.e. harmless when Sentry isn't configured).
const config = getSentryExpoConfig(__dirname)

module.exports = withNativeWind(config, { input: "./src/global.css" })
