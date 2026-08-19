import { describe, expect, it } from 'vitest'
import {
  findMatchingVendor,
  normalizeVendorName,
  resolveVendor,
  type VendorRecord,
} from '@/lib/bills/vendor-match'

const EXISTING_VENDORS: VendorRecord[] = [
  { id: 'v_att', name: 'AT&T Mobility' },
  { id: 'v_pge', name: 'Pacific Gas & Electric' },
  { id: 'v_netflix', name: 'Netflix' },
]

describe('normalizeVendorName', () => {
  it('trims whitespace and title-cases the name', () => {
    expect(normalizeVendorName('  at&t mobility  ')).toBe('At&T Mobility')
  })
})

describe('findMatchingVendor', () => {
  it('fuzzy-matches "AT&T" to the existing "AT&T Mobility" vendor', () => {
    const match = findMatchingVendor('AT&T', EXISTING_VENDORS)
    expect(match).not.toBeNull()
    expect(match?.id).toBe('v_att')
    expect(match?.score).toBeGreaterThan(0.5)
  })

  it('fuzzy-matches minor OCR variation ("Pacific Gas and Electric") to the existing vendor', () => {
    const match = findMatchingVendor('Pacific Gas and Electric', EXISTING_VENDORS)
    expect(match?.id).toBe('v_pge')
  })

  it('returns null when no existing vendor is a plausible match', () => {
    const match = findMatchingVendor('Verizon Wireless', EXISTING_VENDORS)
    expect(match).toBeNull()
  })
})

describe('resolveVendor', () => {
  it('maps "AT&T" onto the existing AT&T Mobility vendor instead of creating a duplicate', () => {
    const resolution = resolveVendor('AT&T', EXISTING_VENDORS)
    expect(resolution.isNew).toBe(false)
    expect(resolution.vendorId).toBe('v_att')
  })

  it('signals creation of a new vendor when no match is found', () => {
    const resolution = resolveVendor('Comcast Xfinity', EXISTING_VENDORS)
    expect(resolution.isNew).toBe(true)
    expect(resolution.vendorId).toBeNull()
    expect(resolution.normalizedName).toBe('Comcast Xfinity')
  })

  it('does not create a duplicate when the candidate name is an exact case-insensitive match', () => {
    const resolution = resolveVendor('netflix', EXISTING_VENDORS)
    expect(resolution.isNew).toBe(false)
    expect(resolution.vendorId).toBe('v_netflix')
  })
})
