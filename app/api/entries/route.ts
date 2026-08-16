export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'

export async function GET() {
  try {
    const { error } = await requireUser()
    if (error) return error
    const entries = await prisma.entry.findMany({
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(entries ?? [])
  } catch (err: any) {
    console.error('GET /api/entries error:', err)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error
    const body = await request?.json?.()
    const { type, date, amount, partyName, checkNumber, category, notes, receiptUrl } =
      body ?? {}

    if (!type || !date || amount == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type !== 'RECEIPT' && type !== 'EXPENSE') {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const cleanName = typeof partyName === 'string' ? partyName.trim() : ''
    const cleanCheck = typeof checkNumber === 'string' ? checkNumber.trim() : ''
    const cleanCategory = typeof category === 'string' ? category.trim() : ''
    const cleanNotes = typeof notes === 'string' ? notes.trim() : ''
    const cleanReceipt = typeof receiptUrl === 'string' ? receiptUrl.trim() : ''

    const entry = await prisma.entry.create({
      data: {
        type,
        date: new Date(date),
        amount: parsedAmount,
        partyName: cleanName || null,
        // Check number only applies to expenses
        checkNumber: type === 'EXPENSE' && cleanCheck ? cleanCheck : null,
        category: cleanCategory || null,
        notes: cleanNotes || null,
        receiptUrl: cleanReceipt || null,
      },
    })

    // Keep the managed vocabulary in sync with any newly used names (non-blocking).
    await syncVocabulary(cleanName, type, cleanCategory).catch((e) =>
      console.error('vocab sync error:', e)
    )

    return NextResponse.json(entry, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/entries error:', err)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}

async function syncVocabulary(name: string, type: string, category: string) {
  if (name) {
    const partyType = type === 'RECEIPT' ? 'customer' : 'vendor'
    const existing = await prisma.vendor.findUnique({ where: { name } })
    if (!existing) {
      await prisma.vendor.create({ data: { name, partyType, isActive: true } })
    }
  }
  if (category) {
    const existing = await prisma.category.findUnique({ where: { name: category } })
    if (!existing) {
      const categoryType = type === 'RECEIPT' ? 'income' : 'expense'
      await prisma.category.create({ data: { name: category, categoryType, isActive: true } })
    }
  }
}
