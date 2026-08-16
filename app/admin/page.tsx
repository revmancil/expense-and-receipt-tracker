import Link from 'next/link'
import { Container } from '@/components/layouts/container'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import ManagedList from './_components/managed-list'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="bg-gradient-to-br from-emerald-50 via-background to-rose-50 dark:from-emerald-950/20 dark:via-background dark:to-rose-950/20">
        <Container size="lg">
          <div className="pt-10 pb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-3 gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to tracker
              </Button>
            </Link>
            <PageHeader
              title="Admin"
              description="Manage categories and customers / vendors. Changes here never affect existing transaction history except intentional renames."
            />
          </div>
        </Container>
      </div>
      <Container size="lg">
        <div className="mt-8 space-y-8">
          <ManagedList
            title="Categories"
            endpoint="/api/categories"
            typeField="categoryType"
            typeLabel="Type"
            typeOptions={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'both', label: 'Both' },
            ]}
            addLabel="New category name"
          />
          <ManagedList
            title="Customers / Vendors"
            endpoint="/api/vendors"
            typeField="partyType"
            typeLabel="Type"
            typeOptions={[
              { value: 'both', label: 'Both' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'customer', label: 'Customer' },
            ]}
            addLabel="New customer / vendor name"
          />
        </div>
      </Container>
    </main>
  )
}
