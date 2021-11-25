import { ENV } from "../../environment"

export const fetchData = async (searchTerm) => {
  if (searchTerm.length < 3) return
  try {
    const response = await fetch(ENV.API_URL + searchTerm)
    const jsonResponse = await response.json()
    const filteredImages = jsonResponse.value
      .filter(
        (element) =>
          element.contentUrl.includes("perfume") ||
          element.contentUrl.includes("fragrance") ||
          element.contentUrl.includes("parfum") ||
          element.contentUrl.includes("cologne") ||
          element.name.includes("perfume") ||
          element.name.includes("fragrance") ||
          element.name.includes("parfum") ||
          element.name.includes("cologne")
      )
      .map((el) => el.contentUrl)
    return filteredImages
  } catch (error) {
    console.log("Something went wrong" + error)
  }
}
