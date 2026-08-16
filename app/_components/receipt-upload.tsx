'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2, X, FileText, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { uploadReceipt, getReceiptViewUrl } from '@/lib/upload-client'

interface ReceiptUploadProps {
  value: string | null | undefined
  onChange: (path: string | null) => void
  idPrefix?: string
}

export default function ReceiptUpload({ value, onChange, idPrefix = 'receipt' }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadReceipt(file)
      onChange(path)
      toast.success('Receipt attached')
    } catch (err: any) {
      console.error('Receipt upload error:', err)
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleView = async () => {
    if (!value) return
    try {
      const url = await getReceiptViewUrl(value)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err: any) {
      console.error('View receipt error:', err)
      toast.error('Could not open receipt')
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={`${idPrefix}-file`}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf"
        onChange={handleFile}
        className="hidden"
      />
      {value ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">Receipt attached</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={handleView} aria-label="View receipt">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(null)}
            aria-label="Remove receipt"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Attach receipt'}
        </Button>
      )}
    </div>
  )
}
