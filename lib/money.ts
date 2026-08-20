// Shared helpers for safe decimal money math. Raw JS floats (e.g. 0.1 + 0.2)
// accumulate rounding error, so every monetary sum in the Bills & Income
// feature is rounded back to the nearest cent through here.

/** Rounds a number to the nearest cent, avoiding float drift. */
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Sums amounts using integer-cents arithmetic, then rounds back to dollars. */
export function sumAmounts(amounts: number[]): number {
  const totalCents = amounts.reduce((cents, amount) => cents + Math.round(amount * 100), 0)
  return totalCents / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
