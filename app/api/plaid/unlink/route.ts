export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid-client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const body = await req.json()
    const plaidItemId = body?.plaidItemId as string
    if (!plaidItemId) {
      return NextResponse.json({ error: 'Missing plaidItemId' }, { status: 400 })
    }

    const item = await prisma.plaidItem.findUnique({ where: { id: plaidItemId } })
    if (!item) {
      return NextResponse.json({ error: 'Linked account not found' }, { status: 404 })
    }

    // Remove from Plaid
    try {
      await plaidClient.itemRemove({ access_token: item.accessToken })
    } catch {
      // Ignore — may already be removed on Plaid's side
    }

    await prisma.plaidItem.delete({ where: { id: plaidItemId } })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Plaid unlink error:', err)
    return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 })
  }
}
