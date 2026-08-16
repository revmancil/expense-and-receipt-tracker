import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AuthForm from './auth-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/')
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-rose-50 dark:from-emerald-950/20 dark:via-background dark:to-rose-950/20 px-4">
      <AuthForm />
    </main>
  )
}
