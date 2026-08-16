'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SafeNumber } from '@/components/safe-format'
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import type { EntryData } from './tracker-app'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: EntryData[]
  filteredEntries: EntryData[]
  hasFilters: boolean
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
}

export default function ReportsModal({ open, onOpenChange, entries, filteredEntries, hasFilters }: Props) {
  const data = hasFilters ? filteredEntries : entries

  const summary = useMemo(() => {
    const income = data.filter(e => e.type === 'RECEIPT').reduce((s, e) => s + (e.amount ?? 0), 0)
    const expenses = data.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + (e.amount ?? 0), 0)
    return { income, expenses, net: income - expenses, count: data.length }
  }, [data])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number; count: number }>()
    for (const e of data) {
      const cat = e.category || 'Uncategorized'
      if (!map.has(cat)) map.set(cat, { income: 0, expenses: 0, count: 0 })
      const rec = map.get(cat)!
      if (e.type === 'RECEIPT') rec.income += e.amount ?? 0
      else rec.expenses += e.amount ?? 0
      rec.count++
    }
    return Array.from(map.entries())
      .map(([name, vals]) => ({ name, ...vals, net: vals.income - vals.expenses }))
      .sort((a, b) => b.expenses - a.expenses || b.income - a.income)
  }, [data])

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>()
    for (const e of data) {
      if (!e.date) continue
      const d = new Date(e.date)
      if (isNaN(d.getTime())) continue
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, { income: 0, expenses: 0 })
      const rec = map.get(key)!
      if (e.type === 'RECEIPT') rec.income += e.amount ?? 0
      else rec.expenses += e.amount ?? 0
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, vals]) => ({ month, ...vals, net: vals.income - vals.expenses }))
  }, [data])

  // Top vendors/customers by spend
  const topParties = useMemo(() => {
    const map = new Map<string, { total: number; count: number; type: string }>()
    for (const e of data) {
      const name = e.partyName || 'Unknown'
      if (!map.has(name)) map.set(name, { total: 0, count: 0, type: e.type })
      const rec = map.get(name)!
      rec.total += e.amount ?? 0
      rec.count++
    }
    return Array.from(map.entries())
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }, [data])

  // Date range
  const dateRange = useMemo(() => {
    const dates = data.filter(e => e.date).map(e => new Date(e.date).getTime()).filter(t => !isNaN(t))
    if (!dates.length) return null
    return { from: fmtDate(new Date(Math.min(...dates)).toISOString()), to: fmtDate(new Date(Math.max(...dates)).toISOString()) }
  }, [data])

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-')
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${names[parseInt(m, 10)] || m} ${y}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5" /> Reports
            {hasFilters && <Badge variant="secondary" className="text-xs">Filtered</Badge>}
          </DialogTitle>
          {dateRange && (
            <p className="text-sm text-muted-foreground mt-1">
              {dateRange.from} — {dateRange.to} · {summary.count} transactions
            </p>
          )}
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold text-emerald-600">
                  $<SafeNumber value={summary.income} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-rose-600">
                  $<SafeNumber value={summary.expenses} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${summary.net >= 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-orange-100 dark:bg-orange-900/40'}`}>
                <DollarSign className={`h-5 w-5 ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Total</p>
                <p className={`text-lg font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {summary.net < 0 ? '-' : ''}$<SafeNumber value={Math.abs(summary.net)} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly breakdown */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyBreakdown.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{monthLabel(m.month)}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      $<SafeNumber value={m.income} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                    <TableCell className="text-right text-rose-600">
                      $<SafeNumber value={m.expenses} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                    <TableCell className={`text-right font-medium ${m.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {m.net < 0 ? '-' : ''}$<SafeNumber value={Math.abs(m.net)} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">#</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      $<SafeNumber value={c.income} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                    <TableCell className="text-right text-rose-600">
                      $<SafeNumber value={c.expenses} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                    <TableCell className={`text-right font-medium ${c.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {c.net < 0 ? '-' : ''}$<SafeNumber value={Math.abs(c.net)} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top vendors/customers */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Vendors / Customers</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right"># Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topParties.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">
                      $<SafeNumber value={p.total} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
