import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import TrackerApp from './_components/tracker-app'
import HeaderUserMenu from './_components/header-user-menu'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="bg-gradient-to-br from-emerald-50 via-background to-rose-50 dark:from-emerald-950/20 dark:via-background dark:to-rose-950/20">
        <Container size="lg">
          <div className="pt-10 pb-6">
            <div className="flex items-start justify-between gap-4">
              <PageHeader
                title="Receipt & Expense Tracker"
                description="Record and manage your receipts and expenses in one place."
              />
              <HeaderUserMenu />
            </div>
          </div>
        </Container>
      </div>
      <Container size="lg">
        <TrackerApp />
      </Container>
    </main>
  )
}
