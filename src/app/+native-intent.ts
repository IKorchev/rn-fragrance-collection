// Rewrites incoming native deep links before Expo Router resolves them.
// The Google OAuth redirect (<applicationId>:/oauthredirect) is consumed by
// expo-auth-session, not the router — send the router home instead of letting
// it land on the unmatched-route screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes("oauthredirect")) return "/"
  return path
}
