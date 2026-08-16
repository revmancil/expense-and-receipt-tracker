'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FadeIn } from '@/components/ui/animate'
import { PieChartIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { EntryData } from './tracker-app'

interface CategoryPieProps {
  entries: EntryData[]
}

const COLORS = [
  '#059669', '#2563eb', '#e11d48', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488',
  '#4f46e5', '#c026d3', '#ca8a04', '#dc2626', '#16a34a',
]

export default function CategoryPie({ entries }: CategoryPieProps) {
  const [mode, setMode] = useState<'expense' | 'income'>('expense')

  const data = useMemo(() => {
    const wantType = mode === 'income' ? 'RECEIPT' : 'EXPENSE'
    const map = new Map<string, number>()
    ;(entries ?? []).forEach((e: EntryData) => {
      if (e?.type !== wantType) return
      const key = (e?.category ?? '').trim() || '(Uncategorized)'
      map.set(key, (map.get(key) ?? 0) + Math.abs(e?.amount ?? 0))
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [entries, mode])

  const currencyFmt = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0)

  return (
    <FadeIn>
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-xl tracking-tight">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Category Breakdown
          </CardTitle>
          <Tabs value={mode} onValueChange={(v: string) => setMode(v as 'expense' | 'income')}>
            <TabsList>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PieChartIcon className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">No {mode} data in the selected range.</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={1}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [currencyFmt(value), name]}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}
