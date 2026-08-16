/**
 * Idempotent vocabulary seed.
 * Populates the Category and Vendor managed tables from names already present
 * on existing entries, inferring the type from how each name is actually used.
 * Uses upsert only — never deletes — so it is safe to re-run.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Seed authentication accounts (idempotent upsert on email).
async function seedUsers() {
  const accounts = [
    // Mandatory hidden test/admin account.
    { email: 'abacus-f09d61dc@example.com', password: 'm9*dEMvSWb', name: 'Test Admin', role: 'admin' },
    // Owner admin account for the client.
    { email: 'michelle@tracker.app', password: 'Ledger2026!Mich', name: 'Michelle', role: 'admin' },
  ]
  for (const acc of accounts) {
    const hashed = await bcrypt.hash(acc.password, 10)
    await prisma.user.upsert({
      where: { email: acc.email },
      update: { role: acc.role, name: acc.name },
      create: { email: acc.email, password: hashed, name: acc.name, role: acc.role },
    })
  }
  console.log(`Seeded/verified ${accounts.length} auth accounts.`)
}

function inferType(types: Set<string>, incomeVal: string, expenseVal: string): string {
  const hasIncome = types.has('RECEIPT')
  const hasExpense = types.has('EXPENSE')
  if (hasIncome && hasExpense) return 'both'
  if (hasIncome) return incomeVal
  return expenseVal
}

async function main() {
  const entries = await prisma.entry.findMany({
    select: { type: true, partyName: true, category: true },
  })

  // Group distinct category names -> set of entry types that use them
  const catUsage = new Map<string, { display: string; types: Set<string> }>()
  const vendorUsage = new Map<string, { display: string; types: Set<string> }>()

  for (const e of entries) {
    const cat = (e.category ?? '').trim()
    if (cat) {
      const key = cat.toLowerCase()
      if (!catUsage.has(key)) catUsage.set(key, { display: cat, types: new Set() })
      catUsage.get(key)!.types.add(e.type)
    }
    const party = (e.partyName ?? '').trim()
    if (party) {
      const key = party.toLowerCase()
      if (!vendorUsage.has(key)) vendorUsage.set(key, { display: party, types: new Set() })
      vendorUsage.get(key)!.types.add(e.type)
    }
  }

  let catCount = 0
  for (const { display, types } of Array.from(catUsage.values())) {
    const categoryType = inferType(types, 'income', 'expense')
    await prisma.category.upsert({
      where: { name: display },
      update: {}, // never overwrite an admin's later edits
      create: { name: display, categoryType, isActive: true },
    })
    catCount++
  }

  let vendorCount = 0
  for (const { display, types } of Array.from(vendorUsage.values())) {
    const partyType = inferType(types, 'customer', 'vendor')
    await prisma.vendor.upsert({
      where: { name: display },
      update: {},
      create: { name: display, partyType, isActive: true },
    })
    vendorCount++
  }

  console.log(`Seeded/verified ${catCount} categories and ${vendorCount} vendors/customers.`)

  await seedUsers()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
