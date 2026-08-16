'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Settings, LogOut } from 'lucide-react'

export default function HeaderUserMenu() {
  const { data: session, status } = useSession() || {}
  const role = (session?.user as any)?.role
  const isAdmin = role === 'admin'

  if (status !== 'authenticated') return null

  return (
    <div className="flex items-center gap-2 shrink-0">
      {isAdmin && (
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" /> Admin
          </Button>
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="h-4 w-4" /> Log Out
      </Button>
    </div>
  )
}
