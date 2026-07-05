const RECENTLY_WORN_MS = 24 * 60 * 60 * 1000

interface Wearable {
  times_worn: number | null
  last_worn: string | null
}

// Favor fragrances worn less often, and heavily deprioritize (but don't fully
// exclude) whatever was worn in the last 24h so the picker doesn't loop on it.
export const pickWeightedIndex = (col: Wearable[]): number => {
  if (!col.length) return -1
  const now = Date.now()
  const weights = col.map((item) => {
    let weight = 1 / ((item.times_worn ?? 0) + 1)
    // last_worn is a TIMESTAMPTZ → ISO string from Postgres
    const lastWornMs = item.last_worn ? new Date(item.last_worn).getTime() : null
    if (lastWornMs && now - lastWornMs < RECENTLY_WORN_MS) {
      weight *= 0.15
    }
    return weight
  })
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}
