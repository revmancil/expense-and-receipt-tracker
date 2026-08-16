'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FadeIn } from '@/components/ui/animate'
import { BarChart3 } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { EntryData } from './tracker-app'

interface MonthlyChartProps {
  entries: EntryData[]
}

interface MonthlyDatum {
  key: string
  label: string
  income: number
  expenses: number
  net: number
}

export default function MonthlyChart({ entries }: MonthlyChartProps) {
  const data = useMemo<MonthlyDatum[]>(() => {
    const safeEntries = entries ?? []
    const map = new Map<string, MonthlyDatum>()

    safeEntries.forEach((e: EntryData) => {
      if (!e?.date) return
      const d = new Date(e.date)
      if (isNaN(d.getTime())) return
      const year = d.getUTCFullYear()
      const month = d.getUTCMonth()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
      const existing = map.get(key) ?? { key, label, income: 0, expenses: 0, net: 0 }
      if (e?.type === 'RECEIPT') {
        existing.income += e?.amount ?? 0
      } else if (e?.type === 'EXPENSE') {
        existing.expenses += e?.amount ?? 0
      }
      existing.net = existing.income - existing.expenses
      map.set(key, existing)
    })

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [entries])

  const currencyFmt = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val ?? 0)

  return (
    <FadeIn>
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl tracking-tight">
            <BarChart3 className="h-5 w-5 text-primary" />
            Monthly Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">No data to chart yet. Add entries to see monthly totals.</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => currencyFmt(v)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [currencyFmt(value), name]}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}
