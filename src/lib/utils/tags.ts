// Client-side mirror of the DB's valid_tag_array check (db/schema.sql):
// lowercase, trimmed, 1-24 chars, up to 12 distinct tags per fragrance.
export const MAX_TAG_LENGTH = 24
export const MAX_TAGS_PER_FRAGRANCE = 12

// Returns null for input that wouldn't survive normalization (empty, too
// long) rather than throwing — callers just no-op on null.
export const normalizeTag = (raw: string): string | null => {
  const tag = raw.trim().toLowerCase()
  if (tag.length < 1 || tag.length > MAX_TAG_LENGTH) return null
  return tag
}

export const addTag = (tags: string[], raw: string): string[] => {
  const tag = normalizeTag(raw)
  if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS_PER_FRAGRANCE) return tags
  return [...tags, tag]
}

export const removeTag = (tags: string[], tag: string): string[] =>
  tags.filter((t) => t !== tag)
