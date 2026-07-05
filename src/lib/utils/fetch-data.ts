export interface SearchResult {
  place?: number | null
  name: string
  imageUrl?: string | null
  rating?: number | string | null
  totalVotes?: number | string | null
}

export const fetchData = async (searchTerm: string): Promise<SearchResult[]> => {
  const url = `${process.env.EXPO_PUBLIC_API_URL}/search/${searchTerm}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Search failed (${response.status})`)
  const jsonResponse = await response.json()
  return jsonResponse.data
}
