'use client'

// IMPORTANT: Do not remove this component.
// It handles two cases of ChunkLoadError:
//   1. A Next.js dev server race condition where dynamic chunks imported by
//      next/dynamic haven't been compiled yet.
//   2. Stale cached HTML after a new deploy referencing old chunk hashes that
//      no longer exist (surfaces as a failed dynamic import / hydration error).
// It reloads the page once to fetch fresh assets, guarding against reload loops.

import { useEffect } from 'react'

const RELOAD_GUARD_KEY = 'chunk-reload-ts'
const RELOAD_COOLDOWN_MS = 10000

export function isRecoverableLoadError(message?: string, name?: string): boolean {
  if (!message && !name) return false
  const text = `${name ?? ''} ${message ?? ''}`
  return (
    text.includes('ChunkLoadError') ||
    text.includes('Loading chunk') ||
    text.includes('Loading CSS chunk') ||
    text.includes('Failed to fetch dynamically imported module') ||
    text.includes('error loading dynamically imported module') ||
    text.includes('Importing a module script failed') ||
    text.includes("Unexpected token '<'") ||
    /Minified React error #(418|421|422|423|425)/.test(text)
  )
}

export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? '0')
    const now = Date.now()
    if (now - last < RELOAD_COOLDOWN_MS) return
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now))
  } catch {
    // sessionStorage may be unavailable; still attempt a reload
  }
  window.location.reload()
}

export function ChunkLoadErrorHandler() {
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      if (isRecoverableLoadError(event?.error?.message ?? event?.message, event?.error?.name)) {
        event.preventDefault()
        reloadOnce()
      }
    }
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason: any = event?.reason
      if (isRecoverableLoadError(reason?.message ?? String(reason ?? ''), reason?.name)) {
        event.preventDefault()
        reloadOnce()
      }
    }
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectionHandler)
    return () => {
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', rejectionHandler)
    }
  }, [])

  return null
}
