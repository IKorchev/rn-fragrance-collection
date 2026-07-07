import { useCallback, useState } from "react"

// Pull-to-refresh state for a react-query refetch. Tracks its own `refreshing`
// flag (instead of the query's isRefetching) so background invalidations —
// e.g. a wear write invalidating ["top-worn"] — don't pop the pull spinner.
export const usePullToRefresh = (refetch: () => Promise<unknown>) => {
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  return { refreshing, onRefresh }
}
