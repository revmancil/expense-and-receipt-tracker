'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComboInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  className?: string
}

/**
 * A free-text input with a dropdown of previously used values.
 * Users can pick an existing name or type a brand new one — new names
 * automatically become options once the entry is saved.
 */
export function ComboInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  inputMode = 'text',
  className,
}: ComboInputProps) {
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const safeOptions = React.useMemo(() => options ?? [], [options])

  // Show everything when the field is empty or exactly matches a saved value,
  // otherwise narrow the list down as the user types.
  const filtered = React.useMemo(() => {
    const q = (value ?? '').trim().toLowerCase()
    if (!q) return safeOptions
    const exact = safeOptions.some((o: string) => o.toLowerCase() === q)
    if (exact) return safeOptions
    return safeOptions.filter((o: string) => o.toLowerCase().includes(q))
  }, [safeOptions, value])

  // Close the dropdown when clicking anywhere outside the field.
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHighlight(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = (opt: string) => {
    onChange(opt)
    setOpen(false)
    setHighlight(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlight(0)
        return
      }
      setHighlight((h: number) => (filtered.length === 0 ? -1 : (h + 1) % filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return
      setHighlight((h: number) =>
        filtered.length === 0 ? -1 : (h - 1 + filtered.length) % filtered.length
      )
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0 && highlight < filtered.length) {
        // A dropdown option is highlighted: pick it instead of submitting.
        e.preventDefault()
        select(filtered[highlight])
      } else {
        // Nothing highlighted: close the list and let the form submit normally.
        setOpen(false)
        setHighlight(-1)
      }
    } else if (e.key === 'Escape') {
      if (open) {
        // Only dismiss the dropdown — don't let the key bubble up and close a
        // surrounding dialog as well.
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        setHighlight(-1)
      }
    }
  }

  const hasOptions = safeOptions.length > 0

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange(e?.target?.value ?? '')
          setOpen(true)
          setHighlight(-1)
        }}
        onFocus={() => {
          if (hasOptions) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        className={cn('w-full', hasOptions && 'pr-9')}
      />

      {hasOptions && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show saved options"
          onClick={() => setOpen((o: boolean) => !o)}
          className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches — press Save to add &ldquo;{value.trim()}&rdquo; as a new name.
            </div>
          ) : (
            filtered.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => select(opt)}
                onMouseEnter={() => setHighlight(filtered.indexOf(opt))}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                  filtered.indexOf(opt) === highlight
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className="truncate">{opt}</span>
                {opt === value && <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
