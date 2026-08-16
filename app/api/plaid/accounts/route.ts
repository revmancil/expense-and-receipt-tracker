export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'

export async function GET() {
  try {
    const { error } = await requireUser()
    if (error) return error

    const items = await prisma.plaidItem.findMany({
      select: { id: true, institutionName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(items)
  } catch (err: any) {
    console.error('GET /api/plaid/accounts error:', err)
    return NextResponse.json({ error: 'Failed to fetch linked accounts' }, { status: 500 })
  }
}
