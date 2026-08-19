// Fuzzy-matches extracted vendor names against the existing Vendor
// directory, to avoid creating duplicate vendors (e.g. "AT&T" vs
// "AT&T Mobility").

/** A candidate match must clear this Jaccard token-overlap score to count. */
const MATCH_THRESHOLD = 0.5

export interface VendorRecord {
  id: string
  name: string
}

export interface VendorMatch extends VendorRecord {
  /** Similarity score in [0, 1], 1 being an exact normalized match. */
  score: number
}

export interface VendorResolution {
  /** Existing vendor id if a confident match was found, else null. */
  vendorId: string | null
  /** True when no existing vendor matched and a new one should be created. */
  isNew: boolean
  /** Trimmed, title-cased vendor name to use/create. */
  normalizedName: string
  match: VendorMatch | null
}

/** Trims whitespace and title-cases a vendor name (e.g. "at&t " -> "At&T"). */
export function normalizeVendorName(name: string): string {
  const collapsed = name.trim().replace(/\s+/g, ' ')
  return collapsed.replace(
    /[A-Za-z]+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )
}

/** Splits a name into lowercase comparison tokens, treating "&" as "and". */
function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection++
  }
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Finds the best fuzzy match for `candidateName` among `vendors`, or null if
 * no candidate clears the confidence threshold (e.g. "AT&T" should match
 * "AT&T Mobility" but "Verizon" should not).
 */
export function findMatchingVendor(
  candidateName: string,
  vendors: VendorRecord[]
): VendorMatch | null {
  const candidateTokens = tokenize(candidateName)
  let best: VendorMatch | null = null
  for (const vendor of vendors) {
    const score = jaccardSimilarity(candidateTokens, tokenize(vendor.name))
    if (!best || score > best.score) {
      best = { ...vendor, score }
    }
  }
  return best && best.score > MATCH_THRESHOLD ? best : null
}

/**
 * Resolves a candidate vendor name to either an existing vendor (fuzzy
 * match) or a signal to create a new one.
 */
export function resolveVendor(candidateName: string, vendors: VendorRecord[]): VendorResolution {
  const normalizedName = normalizeVendorName(candidateName)
  const match = findMatchingVendor(candidateName, vendors)
  return {
    vendorId: match?.id ?? null,
    isNew: !match,
    normalizedName,
    match,
  }
}
