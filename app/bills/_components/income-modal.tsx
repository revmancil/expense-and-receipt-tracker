'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { INCOME_FREQUENCIES, type IncomeFrequency } from '@/lib/bills/income'

const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  ONE_TIME: 'One time',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
}

interface IncomeModalProps {
  onIncomeAdded: () => void
}

export default function IncomeModal({ onIncomeAdded }: IncomeModalProps) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [frequency, setFrequency] = useState<IncomeFrequency>('ONE_TIME')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setSource('')
    setAmount('')
    setDate('')
    setFrequency('ONE_TIME')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()

    const parsedAmount = parseFloat(amount)
    if (!source.trim() || !date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please fill in source, a positive amount, and a date')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, amount: parsedAmount, date, frequency, notes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to add income')
      }
      toast.success('Income added')
      reset()
      setOpen(false)
      onIncomeAdded()
    } catch (err: any) {
      console.error('Add income error:', err)
      toast.error(err?.message ?? 'Failed to add income')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="income-source" className="mb-2 block text-sm font-medium">
              Source
            </Label>
            <Input
              id="income-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Acme Corp Payroll"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="income-amount" className="mb-2 block text-sm font-medium">
                Amount
              </Label>
              <Input
                id="income-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="income-date" className="mb-2 block text-sm font-medium">
                Date
              </Label>
              <Input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="income-frequency" className="mb-2 block text-sm font-medium">
              Frequency
            </Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as IncomeFrequency)}>
              <SelectTrigger id="income-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCOME_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="income-notes" className="mb-2 block text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="income-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving...' : 'Save Income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
