'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComboInput } from '@/components/ui/combo-input'
import { Receipt, TrendingDown, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import ReceiptUpload from './receipt-upload'
import type { EntryData } from './tracker-app'
import type { EntrySuggestions } from '@/lib/suggestions'

interface EditEntryDialogProps {
  entry: EntryData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  suggestions: EntrySuggestions
}

// Convert a stored date (ISO string) to the yyyy-MM-dd value an <input type="date"> expects,
// using UTC to stay consistent with how dates are displayed elsewhere.
function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function EditEntryDialog({
  entry,
  open,
  onOpenChange,
  onSaved,
  suggestions,
}: EditEntryDialogProps) {
  const [type, setType] = useState<'RECEIPT' | 'EXPENSE'>('RECEIPT')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [partyName, setPartyName] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sync form fields whenever a new entry is opened for editing.
  useEffect(() => {
    if (entry) {
      setType(entry.type === 'EXPENSE' ? 'EXPENSE' : 'RECEIPT')
      setDate(toDateInputValue(entry.date))
      setAmount(entry.amount != null ? String(entry.amount) : '')
      setPartyName(entry.partyName ?? '')
      setCheckNumber(entry.checkNumber ?? '')
      setCategory(entry.category ?? '')
      setNotes(entry.notes ?? '')
      setReceiptUrl(entry.receiptUrl ?? null)
    }
  }, [entry])

  const isReceipt = type === 'RECEIPT'

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault?.()
    if (!entry?.id) return
    if (!date || !amount) {
      toast.error('Please fill in both date and amount')
      return
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'PATCH',
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
        throw new Error(errData?.error ?? 'Failed to update entry')
      }
      toast.success('Entry updated successfully')
      onOpenChange(false)
      onSaved?.()
    } catch (err: any) {
      console.error('Update entry error:', err)
      toast.error(err?.message ?? 'Failed to update entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">Edit Entry</DialogTitle>
          <DialogDescription>
            Update the details for this entry, including customer / vendor and category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
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
              <Label htmlFor="edit-date" className="mb-2 block text-sm font-medium">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e?.target?.value ?? '')}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount" className="mb-2 block text-sm font-medium">Amount ($)</Label>
              <Input
                id="edit-amount"
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
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${isReceipt ? '' : 'sm:grid-cols-2'}`}>
            <div>
              <Label htmlFor="edit-partyName" className="mb-2 block text-sm font-medium">
                {isReceipt ? 'Customer' : 'Vendor'} <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <ComboInput
                id="edit-partyName"
                placeholder={isReceipt ? 'Customer name' : 'Vendor name'}
                value={partyName}
                onChange={setPartyName}
                options={isReceipt ? suggestions?.customers ?? [] : suggestions?.vendors ?? []}
              />
            </div>
            {!isReceipt && (
              <div>
                <Label htmlFor="edit-checkNumber" className="mb-2 block text-sm font-medium">
                  Check Number <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="edit-checkNumber"
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
            <Label htmlFor="edit-category" className="mb-2 block text-sm font-medium">
              Category <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <ComboInput
              id="edit-category"
              placeholder="e.g. Office Supplies, Travel, Utilities"
              value={category}
              onChange={setCategory}
              options={suggestions?.categories ?? []}
            />
          </div>

          <div>
            <Label htmlFor="edit-notes" className="mb-2 block text-sm font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="edit-notes"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e?.target?.value ?? '')}
              className="w-full min-h-[64px]"
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">
              Receipt <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} idPrefix="edit" />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
