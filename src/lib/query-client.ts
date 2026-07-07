import { AppState, Platform } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import { QueryClient, onlineManager, focusManager } from "@tanstack/react-query"

// Pause queries while offline and refire them on reconnect — without this a
// query that fails in a tunnel stays failed until its staleTime elapses.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
)

// Refetch stale queries when the app returns to the foreground (react-query's
// web "window focus" has no native equivalent unless we forward AppState).
AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active")
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})
