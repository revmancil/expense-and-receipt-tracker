export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { requireUser } from '@/lib/auth-guard'

// ---- helpers -------------------------------------------------------------

// Format a stored date as MM/DD/YYYY text using UTC (no off-by-one shifts).
function formatDateMMDDYYYY(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${mm}/${dd}/${yyyy}`
}

// Build a UTC-normalized Date (midnight UTC) for real Excel date cells.
function toExcelDate(dateVal: any): Date | string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// Signed amount: expenses negative, income (receipts) positive.
function signedAmount(e: any): number {
  const amt = Math.abs(e?.amount ?? 0)
  return e?.type === 'EXPENSE' ? -amt : amt
}

function typeLabel(e: any): string {
  return e?.type === 'RECEIPT' ? 'Income' : 'Expense'
}

// RFC-4180 style CSV escaping.
function csvCell(val: any): string {
  const s = val == null ? '' : String(val)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

const CSV_HEADERS = [
  'Vendor / Customer',
  'Amount',
  'Date',
  'Category',
  'Type',
  'Notes',
  'Check Number',
  'Receipt URL',
]

function entryToRow(e: any) {
  return {
    'Vendor / Customer': e?.partyName ?? '',
    Amount: signedAmount(e),
    Date: formatDateMMDDYYYY(e?.date),
    Category: e?.category ?? '',
    Type: typeLabel(e),
    Notes: e?.notes ?? '',
    'Check Number': e?.checkNumber ?? '',
    'Receipt URL': e?.receiptUrl ?? '',
  }
}

// Excel row uses a real Date object for the Date column.
function entryToXlsxRow(e: any) {
  return {
    'Vendor / Customer': e?.partyName ?? '',
    Amount: signedAmount(e),
    Date: toExcelDate(e?.date),
    Category: e?.category ?? '',
    Type: typeLabel(e),
    Notes: e?.notes ?? '',
    'Check Number': e?.checkNumber ?? '',
    'Receipt URL': e?.receiptUrl ?? '',
  }
}

const COL_WIDTHS = [
  { wch: 26 }, // Vendor / Customer
  { wch: 14 }, // Amount
  { wch: 14 }, // Date
  { wch: 20 }, // Category
  { wch: 12 }, // Type
  { wch: 30 }, // Notes
  { wch: 14 }, // Check Number
  { wch: 40 }, // Receipt URL
]

// Apply mm/dd/yyyy number format to the Date column (index 2 => column C).
function applyDateFormat(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cell = ws[XLSX.utils.encode_cell({ r: row, c: 2 })]
    if (cell && cell.t === 'd') {
      cell.z = 'mm/dd/yyyy'
    }
  }
}

// ---- route ---------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error
    const { searchParams } = new URL(req.url)
    const format = (searchParams.get('format') || 'xlsx').toLowerCase()
    const scope = (searchParams.get('scope') || 'all').toLowerCase()
    const from = searchParams.get('from') // yyyy-mm-dd
    const to = searchParams.get('to') // yyyy-mm-dd

    // Build date filter (inclusive) on the stored date.
    const dateFilter: any = {}
    if (from) {
      const d = new Date(`${from}T00:00:00.000Z`)
      if (!isNaN(d.getTime())) dateFilter.gte = d
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999Z`)
      if (!isNaN(d.getTime())) dateFilter.lte = d
    }

    const where: any = {}
    if (scope === 'income') where.type = 'RECEIPT'
    else if (scope === 'expenses') where.type = 'EXPENSE'
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter

    const entries = await prisma.entry.findMany({
      where,
      orderBy: { date: 'desc' },
    })
    const safeEntries = entries ?? []

    const stamp = new Date().toISOString().split('T')[0]

    // ---- CSV ----
    if (format === 'csv') {
      const lines: string[] = []
      lines.push(CSV_HEADERS.map(csvCell).join(','))
      safeEntries.forEach((e: any) => {
        const row = entryToRow(e)
        lines.push(CSV_HEADERS.map((h) => csvCell((row as any)[h])).join(','))
      })
      const csv = '\uFEFF' + lines.join('\r\n') // BOM for Excel compatibility
      const scopeLabel = scope === 'all' ? 'all' : scope
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transactions_${scopeLabel}_${stamp}.csv"`,
        },
      })
    }

    // ---- XLSX (4 sheets) ----
    const workbook = XLSX.utils.book_new()

    const income = safeEntries.filter((e: any) => e?.type === 'RECEIPT')
    const expenses = safeEntries.filter((e: any) => e?.type === 'EXPENSE')

    const buildSheet = (rows: any[]) => {
      const ws = XLSX.utils.json_to_sheet(rows.map(entryToXlsxRow), {
        header: CSV_HEADERS,
        cellDates: true,
      })
      applyDateFormat(ws)
      ws['!cols'] = COL_WIDTHS
      return ws
    }

    XLSX.utils.book_append_sheet(workbook, buildSheet(safeEntries), 'All Transactions')
    XLSX.utils.book_append_sheet(workbook, buildSheet(income), 'Income')
    XLSX.utils.book_append_sheet(workbook, buildSheet(expenses), 'Expenses')

    // ---- Summary sheet ----
    const totalIncome = income.reduce((s: number, e: any) => s + Math.abs(e?.amount ?? 0), 0)
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Math.abs(e?.amount ?? 0), 0)
    const net = totalIncome - totalExpenses

    // By-category (income and expense separated)
    const byCategory = new Map<string, { income: number; expense: number }>()
    safeEntries.forEach((e: any) => {
      const key = (e?.category ?? '').trim() || '(Uncategorized)'
      const rec = byCategory.get(key) ?? { income: 0, expense: 0 }
      if (e?.type === 'RECEIPT') rec.income += Math.abs(e?.amount ?? 0)
      else rec.expense += Math.abs(e?.amount ?? 0)
      byCategory.set(key, rec)
    })

    // By-month
    const byMonth = new Map<string, { income: number; expense: number }>()
    safeEntries.forEach((e: any) => {
      if (!e?.date) return
      const d = new Date(e.date)
      if (isNaN(d.getTime())) return
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      const rec = byMonth.get(key) ?? { income: 0, expense: 0 }
      if (e?.type === 'RECEIPT') rec.income += Math.abs(e?.amount ?? 0)
      else rec.expense += Math.abs(e?.amount ?? 0)
      byMonth.set(key, rec)
    })

    const summaryAoa: any[][] = []
    summaryAoa.push(['Summary'])
    summaryAoa.push([])
    summaryAoa.push(['Total Income', totalIncome])
    summaryAoa.push(['Total Expenses', totalExpenses])
    summaryAoa.push(['Net', net])
    summaryAoa.push([])
    summaryAoa.push(['By Category', 'Income', 'Expense'])
    Array.from(byCategory.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([name, rec]) => summaryAoa.push([name, rec.income, rec.expense]))
    summaryAoa.push([])
    summaryAoa.push(['By Month', 'Income', 'Expense', 'Net'])
    Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, rec]) =>
        summaryAoa.push([month, rec.income, rec.expense, rec.income - rec.expense])
      )

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa)
    summaryWs['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const scopeLabel = scope === 'all' ? 'all' : scope
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="transactions_${scopeLabel}_${stamp}.xlsx"`,
      },
    })
  } catch (err: any) {
    console.error('GET /api/entries/export error:', err)
    return NextResponse.json({ error: 'Failed to export transactions' }, { status: 500 })
  }
}
