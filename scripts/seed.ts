/**
 * Idempotent vocabulary seed.
 * Populates the Category and Vendor managed tables from names already present
 * on existing entries, inferring the type from how each name is actually used.
 * Uses upsert only — never deletes — so it is safe to re-run.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
