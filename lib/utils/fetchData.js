export const fetchData = async (searchTerm) => {
  if (searchTerm.length < 3) return
  try {
    const url = `${process.env.EXPO_PUBLIC_API_URL}/search/${searchTerm}`
    const response = await fetch(url)
    const jsonResponse = await response.json()
    return jsonResponse.data
  } catch (error) {
    console.log("Something went wrong" + error)
  }
}
