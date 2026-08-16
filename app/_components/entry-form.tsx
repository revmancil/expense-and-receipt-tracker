'use client'

import { useState, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComboInput } from '@/components/ui/combo-input'
import { FadeIn } from '@/components/ui/animate'
import { Receipt, TrendingDown, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import ReceiptUpload from './receipt-upload'
import type { EntrySuggestions } from '@/lib/suggestions'
import type { CategoryRec, VendorRec } from './tracker-app'

interface EntryFormProps {
  onEntryAdded: () => void
  suggestions: EntrySuggestions
  categories: CategoryRec[]
  vendors: VendorRec[]
}

export default function EntryForm({ onEntryAdded, suggestions, categories, vendors }: EntryFormProps) {
  const [type, setType] = useState<'RECEIPT' | 'EXPENSE'>('RECEIPT')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [partyName, setPartyName] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const isReceipt = type === 'RECEIPT'

  // Category options filtered by the selected type, unioned with historical names.
  const categoryOptions = useMemo(() => {
    const desired = isReceipt ? 'income' : 'expense'
    const managed = (categories ?? [])
      .filter((c) => c.isActive && (c.categoryType === desired || c.categoryType === 'both'))
      .map((c) => c.name)
    const merged = new Set<string>(managed)
    ;(suggestions?.categories ?? []).forEach((c) => merged.add(c))
    return Array.from(merged).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  }, [categories, suggestions, isReceipt])

  const partyOptions = useMemo(() => {
    return isReceipt ? suggestions?.customers ?? [] : suggestions?.vendors ?? []
  }, [suggestions, isReceipt])

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()

    if (!date || !amount) {
      toast.error('Please fill in both date and amount')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          date,
          amount: parsedAmount,
          partyName,
          checkNumber: type === 'EXPENSE' ? checkNumber : '',
          category,
          notes,
          receiptUrl,
        }),
      })

      if (!res?.ok) {
        const errData = await res?.json?.().catch(() => ({}))
        throw new Error(errData?.error ?? 'Failed to save entry')
      }

      toast.success(`${isReceipt ? 'Income' : 'Expense'} recorded successfully`)
      setDate('')
      setAmount('')
      setPartyName('')
      setCheckNumber('')
      setCategory('')
      setNotes('')
      setReceiptUrl(null)
      onEntryAdded?.()
      setTimeout(() => dateInputRef.current?.focus(), 50)
    } catch (err: any) {
      console.error('Submit error:', err)
      toast.error(err?.message ?? 'Failed to save entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FadeIn>
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl tracking-tight">
            <Plus className="h-5 w-5 text-primary" />
            New Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="mb-2 block text-sm font-medium">Entry Type</Label>
              <Tabs
                value={type}
                onValueChange={(val: string) => {
                  setType(val as 'RECEIPT' | 'EXPENSE')
                  if (val !== 'EXPENSE') setCheckNumber('')
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="RECEIPT"
                    className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900/40 dark:data-[state=active]:text-emerald-300"
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Income
                  </TabsTrigger>
                  <TabsTrigger
                    value="EXPENSE"
                    className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700 dark:data-[state=active]:bg-rose-900/40 dark:data-[state=active]:text-rose-300"
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Expense
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date" className="mb-2 block text-sm font-medium">Date <span className="text-muted-foreground font-normal">(MM/DD/YYYY)</span></Label>
                <Input
                  id="date"
                  ref={dateInputRef}
                  type="date"
                  value={date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e?.target?.value ?? '')}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount" className="mb-2 block text-sm font-medium">Amount ($)</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e?.target?.value ?? ''
                    if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
                      setAmount(raw)
                    }
                  }}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="partyName" className="mb-2 block text-sm font-medium">
                  {isReceipt ? 'Customer' : 'Vendor'} <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <ComboInput
                  id="partyName"
                  placeholder={isReceipt ? 'Customer name' : 'Vendor name'}
                  value={partyName}
                  onChange={setPartyName}
                  options={partyOptions}
                />
              </div>
              {!isReceipt && (
                <div>
                  <Label htmlFor="checkNumber" className="mb-2 block text-sm font-medium">
                    Check Number <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="checkNumber"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 1024"
                    value={checkNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckNumber(e?.target?.value ?? '')}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="category" className="mb-2 block text-sm font-medium">
                Category <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <ComboInput
                id="category"
                placeholder="e.g. Office Supplies, Groceries, Utilities"
                value={category}
                onChange={setCategory}
                options={categoryOptions}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="mb-2 block text-sm font-medium">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e?.target?.value ?? '')}
                className="w-full min-h-[72px]"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">
                Receipt <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} idPrefix="new" />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className={`w-full sm:w-auto ${
                isReceipt
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isReceipt ? (
                <Receipt className="mr-2 h-4 w-4" />
              ) : (
                <TrendingDown className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Saving...' : `Add ${isReceipt ? 'Income' : 'Expense'}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
