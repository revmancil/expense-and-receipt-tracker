'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { SafeNumber } from '@/components/safe-format'
import {
  Receipt,
  TrendingDown,
  DollarSign,
  Download,
  FileSpreadsheet,
  Trash2,
  Pencil,
  Filter,
  X,
  Paperclip,
  BarChart3,
} from 'lucide-react'
import ReportsModal from './reports-modal'
import { toast } from 'sonner'
import type { EntryData, CategoryRec, VendorRec } from './tracker-app'
import type { EntrySuggestions } from '@/lib/suggestions'
import EditEntryDialog from './edit-entry-dialog'
import { getReceiptViewUrl } from '@/lib/upload-client'

const MonthlyChart = dynamic(() => import('./monthly-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 rounded-lg" />,
})
const CategoryPie = dynamic(() => import('./category-pie'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 rounded-lg" />,
})

interface DashboardProps {
  entries: EntryData[]
  loading: boolean
  suggestions: EntrySuggestions
  categories: CategoryRec[]
  vendors: VendorRec[]
}

export default function Dashboard({ entries, loading, suggestions }: DashboardProps) {
  const safeEntries = entries ?? []
  const [editEntry, setEditEntry] = useState<EntryData | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'RECEIPT' | 'EXPENSE'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [partyFilter, setPartyFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const openEdit = (entry: EntryData) => {
    setEditEntry(entry)
    setEditOpen(true)
  }

  const partyOptions = useMemo(() => {
    const set = new Set<string>()
    ;[...(suggestions?.customers ?? []), ...(suggestions?.vendors ?? [])].forEach((n) => {
      if (n) set.add(n)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  }, [suggestions])

  const categoryOptions = suggestions?.categories ?? []

  const filtered = useMemo(() => {
    return safeEntries.filter((e: EntryData) => {
      if (typeFilter !== 'all' && e?.type !== typeFilter) return false
      if (categoryFilter !== 'all' && (e?.category ?? '') !== categoryFilter) return false
      if (partyFilter !== 'all' && (e?.partyName ?? '') !== partyFilter) return false
      if (fromDate || toDate) {
        if (!e?.date) return false
        const d = new Date(e.date)
        if (isNaN(d.getTime())) return false
        const dayUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        if (fromDate) {
          const f = new Date(`${fromDate}T00:00:00.000Z`).getTime()
          if (dayUTC < f) return false
        }
        if (toDate) {
          const t = new Date(`${toDate}T00:00:00.000Z`).getTime()
          if (dayUTC > t) return false
        }
      }
      return true
    })
  }, [safeEntries, typeFilter, categoryFilter, partyFilter, fromDate, toDate])

  const totals = useMemo(() => {
    const income = filtered
      .filter((e: EntryData) => e?.type === 'RECEIPT')
      .reduce((sum: number, e: EntryData) => sum + (e?.amount ?? 0), 0)
    const expenses = filtered
      .filter((e: EntryData) => e?.type === 'EXPENSE')
      .reduce((sum: number, e: EntryData) => sum + (e?.amount ?? 0), 0)
    return { income, expenses, net: income - expenses }
  }, [filtered])

  const hasActiveFilters =
    typeFilter !== 'all' || categoryFilter !== 'all' || partyFilter !== 'all' || !!fromDate || !!toDate

  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
    setPartyFilter('all')
    setFromDate('')
    setToDate('')
  }

  const buildExportUrl = (format: 'xlsx' | 'csv', scopeOverride?: string, respectFilters = true) => {
    const params = new URLSearchParams()
    params.set('format', format)
    let scope = scopeOverride
    if (!scope) {
      scope = typeFilter === 'RECEIPT' ? 'income' : typeFilter === 'EXPENSE' ? 'expenses' : 'all'
    }
    params.set('scope', scope)
    if (respectFilters) {
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
    }
    return `/api/entries/export?${params.toString()}`
  }

  const doDownload = (url: string) => {
    const a = document.createElement('a')
    a.href = url
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleDelete = async (id: string) => {
    if (!id) return
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res?.ok) throw new Error('Delete failed')
      toast.success('Entry deleted')
      window.location.reload()
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error('Failed to delete entry')
    }
  }

  const openReceipt = async (path: string) => {
    try {
      const url = await getReceiptViewUrl(path)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err: any) {
      console.error('Open receipt error:', err)
      toast.error('Could not open receipt')
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr ?? ''
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const yyyy = d.getUTCFullYear()
      return `${mm}/${dd}/${yyyy}`
    } catch {
      return dateStr ?? ''
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i: number) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with export menu */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setReportsOpen(true)}
          >
            <BarChart3 className="h-4 w-4" /> Reports
          </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={(safeEntries?.length ?? 0) === 0}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Excel (.xlsx)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => doDownload(buildExportUrl('xlsx'))}>
              Excel — current filters
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doDownload(buildExportUrl('xlsx', 'all', false))}>
              Excel — all transactions
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>CSV (.csv)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => doDownload(buildExportUrl('csv'))}>
              CSV — current filters
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doDownload(buildExportUrl('csv', 'income'))}>
              CSV — income only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doDownload(buildExportUrl('csv', 'expenses'))}>
              CSV — expenses only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doDownload(buildExportUrl('csv', 'all', false))}>
              CSV — all transactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <ReportsModal
        open={reportsOpen}
        onOpenChange={setReportsOpen}
        entries={safeEntries}
        filteredEntries={filtered}
        hasFilters={hasActiveFilters}
      />

      {/* Filters */}
      <FadeIn>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="min-w-[140px]">
                <Label className="mb-1 block text-xs">Type</Label>
                <Select value={typeFilter} onValueChange={(v: string) => setTypeFilter(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="RECEIPT">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <Label className="mb-1 block text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <Label className="mb-1 block text-xs">Customer / Vendor</Label>
                <Select value={partyFilter} onValueChange={setPartyFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">All</SelectItem>
                    {partyOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[150px]" />
              </div>
              <div>
                <Label className="mb-1 block text-xs">To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[150px]" />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {filtered.length} of {safeEntries.length} transactions
            </p>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Summary Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card className="border-0 shadow-md bg-emerald-50 dark:bg-emerald-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Income</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    <SafeNumber value={totals.income} currency="USD" />
                  </p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/50">
                  <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="border-0 shadow-md bg-rose-50 dark:bg-rose-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Total Expenses</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-rose-700 dark:text-rose-300">
                    <SafeNumber value={totals.expenses} currency="USD" />
                  </p>
                </div>
                <div className="rounded-full bg-rose-100 p-3 dark:bg-rose-900/50">
                  <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className={`border-0 shadow-md ${
            totals.net >= 0
              ? 'bg-blue-50 dark:bg-blue-950/30'
              : 'bg-amber-50 dark:bg-amber-950/30'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    totals.net >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>Net Total</p>
                  <p className={`mt-1 text-2xl font-bold font-mono ${
                    totals.net >= 0
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    <SafeNumber value={totals.net} currency="USD" />
                  </p>
                </div>
                <div className={`rounded-full p-3 ${
                  totals.net >= 0
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-amber-100 dark:bg-amber-900/50'
                }`}>
                  <DollarSign className={`h-5 w-5 ${
                    totals.net >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Charts */}
      <MonthlyChart entries={filtered} />
      <CategoryPie entries={filtered} />

      {/* Transactions Table */}
      <FadeIn>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display text-xl tracking-tight">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(filtered?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileSpreadsheet className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No transactions match the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer / Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Check #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered?.map?.((entry: EntryData, index: number) => (
                      <TableRow key={entry?.id ?? `entry-${index}`}>
                        <TableCell>
                          <Badge
                            variant={entry?.type === 'RECEIPT' ? 'default' : 'destructive'}
                            className={`${
                              entry?.type === 'RECEIPT'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}
                          >
                            {entry?.type === 'RECEIPT' ? (
                              <Receipt className="mr-1 h-3 w-3" />
                            ) : (
                              <TrendingDown className="mr-1 h-3 w-3" />
                            )}
                            {entry?.type === 'RECEIPT' ? 'Income' : 'Expense'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(entry?.date ?? '')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry?.partyName ? entry.partyName : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry?.category ? entry.category : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {entry?.checkNumber ? entry.checkNumber : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${
                          entry?.type === 'RECEIPT'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          <SafeNumber value={entry?.amount ?? 0} currency="USD" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {entry?.receiptUrl && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openReceipt(entry.receiptUrl as string)}
                                className="text-muted-foreground hover:text-primary"
                                aria-label="View receipt"
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(entry)}
                              className="text-muted-foreground hover:text-primary"
                              aria-label="Edit entry"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(entry?.id ?? '')}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) ?? []}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <EditEntryDialog
        entry={editEntry}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => window.location.reload()}
        suggestions={suggestions}
      />
    </div>
  )
}
