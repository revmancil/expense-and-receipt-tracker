'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/money'
import type { BillDisplayStatus } from '@/lib/bills/status'

interface CalendarBill {
  id: string
  amount: number
  dueDate: string
  displayStatus: BillDisplayStatus
  vendor: { id: string; name: string } | null
}

interface CalendarIncome {
  id: string
  source: string
  amount: number
  expectedDate: string
}

interface DailyCashFlow {
  date: string
  income: number
  bills: number
  net: number
}

interface CalendarResponse {
  month: string
  bills: CalendarBill[]
  income: CalendarIncome[]
  dailyCashFlow: DailyCashFlow[]
  totals: { income: number; bills: number; net: number }
}

const STATUS_DOT: Record<BillDisplayStatus, string> = {
  PAID: 'bg-emerald-500',
  PENDING: 'bg-amber-400',
  OVERDUE: 'bg-rose-500',
}

const STATUS_BADGE_VARIANT: Record<BillDisplayStatus, 'default' | 'secondary' | 'destructive'> = {
  PAID: 'secondary',
  PENDING: 'default',
  OVERDUE: 'destructive',
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

// Worst-first so a mixed day shows its most urgent color.
function worstStatus(statuses: BillDisplayStatus[]): BillDisplayStatus {
  if (statuses.includes('OVERDUE')) return 'OVERDUE'
  if (statuses.includes('PENDING')) return 'PENDING'
  return 'PAID'
}

export default function BillsCalendar({ refreshToken }: { refreshToken: number }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bills/calendar?month=${monthKey(year, month)}`)
      if (!res.ok) throw new Error('Failed to load calendar')
      setData(await res.json())
    } catch (err: any) {
      console.error('Fetch calendar error:', err)
      toast.error('Failed to load the bills calendar')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar, refreshToken])

  const billsByDay = useMemo(() => {
    const map = new Map<string, CalendarBill[]>()
    for (const bill of data?.bills ?? []) {
      const key = bill.dueDate.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(bill)
    }
    return map
  }, [data])

  const incomeByDay = useMemo(() => {
    const map = new Map<string, CalendarIncome[]>()
    for (const income of data?.income ?? []) {
      const key = income.expectedDate.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(income)
    }
    return map
  }, [data])

  const netByDay = useMemo(() => {
    const map = new Map<string, DailyCashFlow>()
    for (const day of data?.dailyCashFlow ?? []) map.set(day.date, day)
    return map
  }, [data])

  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstOfMonth.getDay()
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const goToMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  const markPaid = async (billId: string) => {
    setMutatingId(billId)
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if (!res.ok) throw new Error('Failed to update bill')
      toast.success('Marked as paid')
      fetchCalendar()
    } catch (err: any) {
      console.error('Mark paid error:', err)
      toast.error('Could not update bill status')
    } finally {
      setMutatingId(null)
    }
  }

  const monthLabel = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const sortedBills = [...(data?.bills ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Bills & Income Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => goToMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Button variant="outline" size="icon-sm" onClick={() => goToMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Paid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Income
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`blank-${idx}`} />
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayBills = billsByDay.get(iso) ?? []
              const dayIncome = incomeByDay.get(iso) ?? []
              const net = netByDay.get(iso)?.net ?? 0
              const status = dayBills.length ? worstStatus(dayBills.map((b) => b.displayStatus)) : null

              return (
                <div
                  key={iso}
                  className="min-h-[4.5rem] rounded-md border p-1 text-xs flex flex-col gap-1"
                >
                  <span className="font-medium">{day}</span>
                  <div className="flex flex-wrap gap-1">
                    {status && <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />}
                    {dayIncome.length > 0 && <span className="h-2 w-2 rounded-full bg-sky-500" />}
                  </div>
                  {(dayBills.length > 0 || dayIncome.length > 0) && (
                    <span
                      className={`mt-auto truncate font-medium ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      {net >= 0 ? '+' : ''}
                      {formatCurrency(net)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-3 gap-4 rounded-md border p-4 text-sm">
            <div>
              <p className="text-muted-foreground">Expected income</p>
              <p className="font-semibold text-emerald-600">{formatCurrency(data.totals.income)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Bills due</p>
              <p className="font-semibold text-rose-600">{formatCurrency(data.totals.bills)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net cash flow</p>
              <p className={`font-semibold ${data.totals.net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(data.totals.net)}
              </p>
            </div>
          </div>
        )}

        {sortedBills.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Bills this month</h3>
            <div className="divide-y rounded-md border">
              {sortedBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{bill.vendor?.name ?? 'Unknown vendor'}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {new Date(bill.dueDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium">{formatCurrency(bill.amount)}</span>
                    <Badge variant={STATUS_BADGE_VARIANT[bill.displayStatus]}>{bill.displayStatus}</Badge>
                    {bill.displayStatus !== 'PAID' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={mutatingId === bill.id}
                        onClick={() => markPaid(bill.id)}
                      >
                        {mutatingId === bill.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
