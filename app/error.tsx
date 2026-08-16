'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { isRecoverableLoadError, reloadOnce } from '@/components/chunk-load-error-handler'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error)
    if (isRecoverableLoadError(error?.message, error?.name)) {
      reloadOnce()
    }
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The page didn&apos;t load correctly. This usually clears up with a refresh — your saved
        entries are safe.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} variant="outline" className="gap-2">
          Try again
        </Button>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reload page
        </Button>
      </div>
    </div>
  )
}
