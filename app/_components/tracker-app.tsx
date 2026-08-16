'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import EntryForm from './entry-form'
import Dashboard from './dashboard'
import LinkedAccounts from './linked-accounts'
import { buildSuggestions } from '@/lib/suggestions'
import { toast } from 'sonner'

export interface EntryData {
  id: string
  type: string
  date: string
  amount: number
  partyName?: string | null
  checkNumber?: string | null
  category?: string | null
  notes?: string | null
  receiptUrl?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface CategoryRec {
  id: string
  name: string
  categoryType: string // income | expense | both
  isActive: boolean
}

export interface VendorRec {
  id: string
  name: string
  partyType: string // vendor | customer | both
  isActive: boolean
}

export default function TrackerApp() {
  const [entries, setEntries] = useState<EntryData[]>([])
  const [categories, setCategories] = useState<CategoryRec[]>([])
  const [vendors, setVendors] = useState<VendorRec[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/entries')
      if (!res?.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEntries(data ?? [])
    } catch (err: any) {
      console.error('Fetch entries error:', err)
      toast.error('Failed to load entries')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchVocab = useCallback(async () => {
    try {
      const [cRes, vRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/vendors'),
      ])
      if (cRes?.ok) setCategories((await cRes.json()) ?? [])
      if (vRes?.ok) setVendors((await vRes.json()) ?? [])
    } catch (err: any) {
      console.error('Fetch vocabulary error:', err)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchVocab()
  }, [fetchEntries, fetchVocab])

  const handleEntryAdded = () => {
    fetchEntries()
    fetchVocab()
  }

  // Merge managed-record names with names already used on entries so nothing
  // historical ever disappears from the dropdowns.
  const suggestions = useMemo(() => {
    const base = buildSuggestions(entries)
    const activeCustomers = vendors
      .filter((v) => v.isActive && (v.partyType === 'customer' || v.partyType === 'both'))
      .map((v) => v.name)
    const activeVendors = vendors
      .filter((v) => v.isActive && (v.partyType === 'vendor' || v.partyType === 'both'))
      .map((v) => v.name)
    const activeCategories = categories.filter((c) => c.isActive).map((c) => c.name)
    const uniqSort = (arr: string[]) =>
      Array.from(new Set(arr.map((s) => (s ?? '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      )
    return {
      customers: uniqSort([...activeCustomers, ...base.customers]),
      vendors: uniqSort([...activeVendors, ...base.vendors]),
      categories: uniqSort([...activeCategories, ...base.categories]),
    }
  }, [entries, categories, vendors])

  return (
    <div className="mt-8 space-y-8">
      <LinkedAccounts onTransactionsSynced={() => { fetchEntries(); fetchVocab() }} />
      <EntryForm
        onEntryAdded={handleEntryAdded}
        suggestions={suggestions}
        categories={categories}
        vendors={vendors}
      />
      <Dashboard
        entries={entries}
        loading={loading}
        suggestions={suggestions}
        categories={categories}
        vendors={vendors}
      />
    </div>
  )
}
