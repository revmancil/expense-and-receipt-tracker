export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid-client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error

    const body = await req.json()
    const { public_token, institution } = body ?? {}
    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
    }

    const exchange = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchange.data

    // Upsert so re-linking the same institution just updates the access token.
    await prisma.plaidItem.upsert({
      where: { itemId: item_id },
      update: { accessToken: access_token, institutionName: institution?.name ?? null },
      create: {
        itemId: item_id,
        accessToken: access_token,
        institutionName: institution?.name ?? null,
      },
    })

    return NextResponse.json({ ok: true, item_id })
  } catch (err: any) {
    console.error('Plaid exchange error:', err?.response?.data || err)
    return NextResponse.json(
      { error: err?.response?.data?.error_message || 'Token exchange failed' },
      { status: 500 }
    )
  }
}
