import { prisma } from '@/lib/prisma'
import { resolveVendor, type VendorRecord } from './vendor-match'

// Vendor.name carries a DB-level unique constraint and, like Category, the
// vendor directory is a shared household/business vocabulary in this app
// (not partitioned per user) — Bill and Income rows are what get strict
// userId scoping. `userId` on Vendor just records who first created it.
export async function listActiveVendors(): Promise<VendorRecord[]> {
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })
  return vendors
}

/**
 * Resolves a candidate vendor name to an existing Vendor row, creating a
 * new one (tagged with the creating userId) when no confident match exists.
 */
export async function resolveOrCreateVendor(
  userId: string,
  candidateName: string,
  extra?: { category?: string | null; defaultPaymentMethod?: string | null }
): Promise<{ id: string; name: string; created: boolean }> {
  const vendors = await listActiveVendors()
  const resolution = resolveVendor(candidateName, vendors)

  if (!resolution.isNew && resolution.vendorId) {
    const vendor = vendors.find((v) => v.id === resolution.vendorId)!
    return { id: vendor.id, name: vendor.name, created: false }
  }

  try {
    const created = await prisma.vendor.create({
      data: {
        name: resolution.normalizedName,
        userId,
        partyType: 'vendor',
        isActive: true,
        category: extra?.category ?? null,
        defaultPaymentMethod: extra?.defaultPaymentMethod ?? null,
      },
    })
    return { id: created.id, name: created.name, created: true }
  } catch (err: any) {
    // Two concurrent uploads resolved to the same new vendor name — the
    // unique constraint on Vendor.name caught the race. Use the winner.
    if (err?.code === 'P2002') {
      const existing = await prisma.vendor.findUnique({
        where: { name: resolution.normalizedName },
      })
      if (existing) return { id: existing.id, name: existing.name, created: false }
    }
    throw err
  }
}
