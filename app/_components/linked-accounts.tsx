'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Landmark, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import PlaidLinkButton from './plaid-link-button'

interface PlaidAccount {
  id: string
  institutionName: string | null
  createdAt: string
}

interface Props {
  onTransactionsSynced: () => void
}

export default function LinkedAccounts({ onTransactionsSynced }: Props) {
  const { data: session } = useSession() || {}
  const isAdmin = (session?.user as any)?.role === 'admin'
  const [accounts, setAccounts] = useState<PlaidAccount[]>([])
  const [syncing, setSyncing] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/plaid/accounts')
      if (res.ok) setAccounts((await res.json()) ?? [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const syncAll = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Sync failed')
      toast.success(data.message || 'Transactions synced.')
      onTransactionsSynced()
    } catch (err: any) {
      toast.error(err?.message || 'Could not sync transactions.')
    } finally {
      setSyncing(false)
    }
  }

  const unlink = async (id: string) => {
    setUnlinking(id)
    try {
      const res = await fetch('/api/plaid/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaidItemId: id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || 'Unlink failed')
      }
      toast.success('Account unlinked.')
      fetchAccounts()
    } catch (err: any) {
      toast.error(err?.message || 'Could not unlink account.')
    } finally {
      setUnlinking(null)
    }
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5" /> Linked Bank Accounts
        </CardTitle>
        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={syncAll} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync
            </Button>
          )}
          <PlaidLinkButton
            onSuccess={() => {
              fetchAccounts()
              onTransactionsSynced()
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bank accounts linked yet. Click &ldquo;Link Bank Account&rdquo; to connect your bank via Plaid.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="font-medium">{a.institutionName || 'Bank Account'}</span>
                  <span className="ml-2 text-xs text-muted-foreground">Linked {formatDate(a.createdAt)}</span>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={unlinking === a.id}
                    onClick={() => unlink(a.id)}
                  >
                    {unlinking === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
