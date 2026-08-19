import Link from 'next/link'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import BillsIncomeApp from './_components/bills-income-app'
import HeaderUserMenu from '../_components/header-user-menu'

export const dynamic = 'force-dynamic'

export default function BillsPage() {
  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="bg-gradient-to-br from-emerald-50 via-background to-rose-50 dark:from-emerald-950/20 dark:via-background dark:to-rose-950/20">
        <Container size="lg">
          <div className="pt-10 pb-6">
            <div className="flex items-start justify-between gap-4">
              <PageHeader
                title="Bills & Income"
                description="Upload bills for automatic extraction, track income, and see your cash flow on a calendar."
              />
              <HeaderUserMenu />
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-2 gap-2 -ml-3">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Tracker
              </Link>
            </Button>
          </div>
        </Container>
      </div>
      <Container size="lg">
        <BillsIncomeApp />
      </Container>
    </main>
  )
}
