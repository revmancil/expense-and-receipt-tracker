'use client'

import { useState, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { Landmark, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  onSuccess: () => void
}

export default function PlaidLinkButton({ onSuccess }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchLinkToken = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to get link token')
      setLinkToken(data.link_token)
    } catch (err: any) {
      toast.error(err?.message || 'Could not start bank connection.')
      setLoading(false)
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      try {
        const res = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata?.institution ?? null,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d?.error || 'Exchange failed')
        }
        toast.success(`Bank account linked! Syncing transactions…`)
        // Kick off an initial sync
        await fetch('/api/plaid/sync', { method: 'POST' })
        onSuccess()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to link account.')
      }
    },
    onExit: () => {
      setLinkToken(null)
      setLoading(false)
    },
  })

  // When linkToken is fetched and Plaid Link is ready, open it
  // We useEffect-style: once linkToken + ready, open.
  if (linkToken && ready && loading) {
    // setLoading(false) to avoid re-trigger
    setTimeout(() => {
      setLoading(false)
      open()
    }, 0)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={loading}
      onClick={fetchLinkToken}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Landmark className="h-4 w-4" />
      )}
      Link Bank Account
    </Button>
  )
}
