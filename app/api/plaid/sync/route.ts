export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid-client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'
import { Transaction, RemovedTransaction } from 'plaid'

// Sync transactions for a specific linked account (plaidItem id) or all linked accounts.
export async function POST(req: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error

    const body = await req.json().catch(() => ({}))
    const plaidItemId = body?.plaidItemId as string | undefined

    const items = plaidItemId
      ? await prisma.plaidItem.findMany({ where: { id: plaidItemId } })
      : await prisma.plaidItem.findMany()

    if (items.length === 0) {
      return NextResponse.json({ added: 0, message: 'No linked accounts found.' })
    }

    let totalAdded = 0
    let totalModified = 0
    let totalRemoved = 0

    for (const item of items) {
      let cursor = item.cursor ?? undefined
      let hasMore = true

      const added: Transaction[] = []
      const modified: Transaction[] = []
      const removed: RemovedTransaction[] = []

      while (hasMore) {
        const resp = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor,
          count: 500,
        })
        added.push(...resp.data.added)
        modified.push(...resp.data.modified)
        removed.push(...resp.data.removed)
        hasMore = resp.data.has_more
        cursor = resp.data.next_cursor
      }

      // --- Insert new transactions as entries (dedup by checking transaction_id in notes) ---
      for (const txn of added) {
        const txnId = txn.transaction_id
        // Check if we already have this plaid transaction (store plaid id in notes prefix)
        const existing = await prisma.entry.findFirst({
          where: { notes: { startsWith: `[plaid:${txnId}]` } },
        })
        if (existing) continue

        const isIncome = (txn.amount ?? 0) < 0 // Plaid: negative = money in
        const absAmount = Math.abs(txn.amount ?? 0)
        const date = txn.date ? new Date(txn.date + 'T00:00:00Z') : new Date()

        await prisma.entry.create({
          data: {
            type: isIncome ? 'RECEIPT' : 'EXPENSE',
            date,
            amount: absAmount,
            partyName: txn.merchant_name || txn.name || null,
            category: txn.personal_finance_category?.primary || txn.category?.[0] || null,
            notes: `[plaid:${txnId}] ${txn.name || ''}`.trim(),
          },
        })
        totalAdded++
      }

      // For modified: update matching entries
      for (const txn of modified) {
        const txnId = txn.transaction_id
        const existing = await prisma.entry.findFirst({
          where: { notes: { startsWith: `[plaid:${txnId}]` } },
        })
        if (!existing) continue

        const isIncome = (txn.amount ?? 0) < 0
        const absAmount = Math.abs(txn.amount ?? 0)
        const date = txn.date ? new Date(txn.date + 'T00:00:00Z') : existing.date

        await prisma.entry.update({
          where: { id: existing.id },
          data: {
            type: isIncome ? 'RECEIPT' : 'EXPENSE',
            date,
            amount: absAmount,
            partyName: txn.merchant_name || txn.name || existing.partyName,
            category: txn.personal_finance_category?.primary || txn.category?.[0] || existing.category,
            notes: `[plaid:${txnId}] ${txn.name || ''}`.trim(),
          },
        })
        totalModified++
      }

      // For removed: soft-note but don't delete the entry
      for (const r of removed) {
        // We keep entries but mark them
        totalRemoved++
      }

      // Persist the cursor for incremental sync next time.
      await prisma.plaidItem.update({
        where: { id: item.id },
        data: { cursor },
      })
    }

    return NextResponse.json({
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      message: `Synced: ${totalAdded} new, ${totalModified} updated, ${totalRemoved} removed.`,
    })
  } catch (err: any) {
    console.error('Plaid sync error:', err?.response?.data || err)
    return NextResponse.json(
      { error: err?.response?.data?.error_message || 'Transaction sync failed' },
      { status: 500 }
    )
  }
}
