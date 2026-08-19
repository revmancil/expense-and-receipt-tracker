'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UploadCloud, Loader2, FileText, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadReceipt } from '@/lib/upload-client'
import type { ExtractionField } from '@/lib/bills/extraction'

interface VendorResolutionPreview {
  vendorId: string | null
  isNew: boolean
  normalizedName: string
}

interface BillDraftResponse {
  vendorName: string
  amount: number | null
  dueDate: string | null
  invoiceNumber: string | null
  flaggedFields: ExtractionField[]
  needsConfirmation: boolean
  vendorResolution: VendorResolutionPreview | null
  fileUrl: string
  rawExtractedData: Record<string, unknown>
}

const FIELD_LABELS: Record<ExtractionField, string> = {
  amount: 'Amount',
  dueDate: 'Due date',
  vendorName: 'Vendor',
}

interface BillUploadZoneProps {
  onBillCreated: () => void
}

export default function BillUploadZone({ onBillCreated }: BillUploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [draft, setDraft] = useState<BillDraftResponse | null>(null)
  const [vendorName, setVendorName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setUploading(true)
    try {
      const cloud_storage_path = await uploadReceipt(file)
      const res = await fetch('/api/bills/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, fileName: file.name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Extraction failed')
      }
      const data: BillDraftResponse = await res.json()
      setDraft(data)
      setVendorName(data.vendorName ?? '')
      setAmount(data.amount != null ? String(data.amount) : '')
      setDueDate(data.dueDate ?? '')
      setInvoiceNumber(data.invoiceNumber ?? '')
      if (data.needsConfirmation) {
        toast.message('Please confirm the highlighted fields before saving.')
      } else {
        toast.success('Bill extracted — review and save.')
      }
    } catch (err: any) {
      console.error('Bill extraction error:', err)
      toast.error(err?.message ?? 'Could not process that file')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0]
    if (file) processFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }

  const handleCancel = () => {
    setDraft(null)
    setVendorName('')
    setAmount('')
    setDueDate('')
    setInvoiceNumber('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e?.preventDefault?.()
    if (!draft) return

    const parsedAmount = parseFloat(amount)
    if (!vendorName.trim() || !dueDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please fill in vendor, a positive amount, and a due date')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: draft.vendorResolution && !draft.vendorResolution.isNew
            ? draft.vendorResolution.vendorId
            : undefined,
          vendorName,
          amount: parsedAmount,
          dueDate,
          invoiceNumber,
          fileUrl: draft.fileUrl,
          rawExtractedData: draft.rawExtractedData,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to save bill')
      }
      toast.success('Bill saved')
      handleCancel()
      onBillCreated()
    } catch (err: any) {
      console.error('Save bill error:', err)
      toast.error(err?.message ?? 'Failed to save bill')
    } finally {
      setSaving(false)
    }
  }

  const flagged = new Set(draft?.flaggedFields ?? [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload a Bill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {!draft && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/40'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Extracting bill details...</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop a bill here, or click to upload</p>
                <p className="text-xs text-muted-foreground">PDF, PNG, or JPEG</p>
              </>
            )}
          </div>
        )}

        {draft && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span>Draft from uploaded document</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
                aria-label="Discard draft"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {draft.needsConfirmation && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Extraction couldn&apos;t confidently read{' '}
                  {draft.flaggedFields.map((f) => FIELD_LABELS[f]).join(', ')}. Please confirm or
                  fill these in before saving.
                </span>
              </div>
            )}

            <div>
              <Label htmlFor="draft-vendor" className="mb-2 flex items-center gap-2 text-sm font-medium">
                Vendor
                {flagged.has('vendorName') && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                    Needs review
                  </Badge>
                )}
                {draft.vendorResolution && !draft.vendorResolution.isNew && (
                  <Badge variant="secondary">Matched existing vendor</Badge>
                )}
              </Label>
              <Input
                id="draft-vendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="draft-amount" className="mb-2 flex items-center gap-2 text-sm font-medium">
                  Amount
                  {flagged.has('amount') && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                      Needs review
                    </Badge>
                  )}
                </Label>
                <Input
                  id="draft-amount"
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
                <Label htmlFor="draft-due-date" className="mb-2 flex items-center gap-2 text-sm font-medium">
                  Due date
                  {flagged.has('dueDate') && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                      Needs review
                    </Badge>
                  )}
                </Label>
                <Input
                  id="draft-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="draft-invoice" className="mb-2 block text-sm font-medium">
                Invoice number
              </Label>
              <Input
                id="draft-invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                Discard
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Bill'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
