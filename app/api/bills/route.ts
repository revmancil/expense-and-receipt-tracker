export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'
import { roundToCents } from '@/lib/money'
import { computeDisplayStatus } from '@/lib/bills/status'
import { resolveOrCreateVendor } from '@/lib/bills/vendor-service'

export async function GET() {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string

    const bills = await prisma.bill.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
      include: { vendor: { select: { id: true, name: true, category: true } } },
    })

    const now = new Date()
    return NextResponse.json(
      bills.map((bill) => ({ ...bill, displayStatus: computeDisplayStatus(bill, now) }))
    )
  } catch (err: any) {
    console.error('GET /api/bills error:', err)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string

    const body = await request?.json?.()
    const { vendorId, vendorName, amount, dueDate, invoiceNumber, category, fileUrl, rawExtractedData } =
      body ?? {}

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    const parsedDueDate = new Date(dueDate)
    if (Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: 'A valid dueDate is required' }, { status: 400 })
    }

    let resolvedVendorId: string
    if (typeof vendorId === 'string' && vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }
      resolvedVendorId = vendor.id
    } else if (typeof vendorName === 'string' && vendorName.trim()) {
      const vendor = await resolveOrCreateVendor(userId, vendorName, {
        category: typeof category === 'string' && category ? category : null,
      })
      resolvedVendorId = vendor.id
    } else {
      return NextResponse.json({ error: 'vendorId or vendorName is required' }, { status: 400 })
    }

    const bill = await prisma.bill.create({
      data: {
        userId,
        vendorId: resolvedVendorId,
        amount: roundToCents(parsedAmount),
        dueDate: parsedDueDate,
        status: 'PENDING',
        fileUrl: typeof fileUrl === 'string' && fileUrl ? fileUrl : null,
        rawExtractedData: rawExtractedData ?? undefined,
        invoiceNumber:
          typeof invoiceNumber === 'string' && invoiceNumber.trim() ? invoiceNumber.trim() : null,
      },
      include: { vendor: { select: { id: true, name: true, category: true } } },
    })

    return NextResponse.json(
      { ...bill, displayStatus: computeDisplayStatus(bill) },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('POST /api/bills error:', err)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
