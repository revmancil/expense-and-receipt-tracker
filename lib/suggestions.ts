import type { EntryData } from '@/app/_components/tracker-app'

export interface EntrySuggestions {
  customers: string[]
  vendors: string[]
  categories: string[]
}

function sortedUnique(values: string[]): string[] {
  const seen = new Map<string, string>()
  values.forEach((v: string) => {
    const trimmed = (v ?? '').trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) seen.set(key, trimmed)
  })
  return Array.from(seen.values()).sort((a: string, b: string) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  )
}

/**
 * Builds the dropdown option lists from names already saved on existing entries.
 * Customer names come from receipts, vendor names from expenses, and categories
 * from both — so any new name becomes a reusable option after it is saved once.
 */
export function buildSuggestions(entries: EntryData[] | null | undefined): EntrySuggestions {
  const safe = entries ?? []
  return {
    customers: sortedUnique(
      safe.filter((e: EntryData) => e?.type === 'RECEIPT').map((e: EntryData) => e?.partyName ?? '')
    ),
    vendors: sortedUnique(
      safe.filter((e: EntryData) => e?.type === 'EXPENSE').map((e: EntryData) => e?.partyName ?? '')
    ),
    categories: sortedUnique(safe.map((e: EntryData) => e?.category ?? '')),
  }
}
