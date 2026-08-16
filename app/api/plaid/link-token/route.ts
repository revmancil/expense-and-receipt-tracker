export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid-client'
import { requireUser } from '@/lib/auth-guard'
import { CountryCode, Products } from 'plaid'

export async function POST() {
  try {
    const { session, error } = await requireUser()
    if (error) return error

    const userId = (session!.user as any).id ?? 'default-user'

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Receipt & Expense Tracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: any) {
    console.error('Plaid link-token error:', err?.response?.data || err)
    return NextResponse.json(
      { error: err?.response?.data?.error_message || 'Failed to create link token' },
      { status: 500 }
    )
  }
}
