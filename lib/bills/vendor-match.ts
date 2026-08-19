// Contract for fuzzy-matching extracted vendor names against the existing
// Vendor directory, to avoid creating duplicate vendors (e.g. "AT&T" vs
// "AT&T Mobility"). Implementation lands in a later step (Green stage).

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
export function normalizeVendorName(_name: string): string {
  throw new Error('normalizeVendorName is not implemented yet')
}

/**
 * Finds the best fuzzy match for `candidateName` among `vendors`, or null if
 * no candidate clears the confidence threshold (e.g. "AT&T" should match
 * "AT&T Mobility" but "Verizon" should not).
 */
export function findMatchingVendor(
  _candidateName: string,
  _vendors: VendorRecord[]
): VendorMatch | null {
  throw new Error('findMatchingVendor is not implemented yet')
}

/**
 * Resolves a candidate vendor name to either an existing vendor (fuzzy
 * match) or a signal to create a new one.
 */
export function resolveVendor(_candidateName: string, _vendors: VendorRecord[]): VendorResolution {
  throw new Error('resolveVendor is not implemented yet')
}
