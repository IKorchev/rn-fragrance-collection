// A translation dictionary is an arbitrarily nested tree of strings, looked
// up by dot-path (e.g. "profile.stats.thisMonth") — see translate.ts.
export type Dictionary = { [key: string]: string | Dictionary }
