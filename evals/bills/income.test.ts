import { describe, expect, it } from 'vitest'
import { validateIncomeInput, type IncomeInput } from '@/lib/bills/income'

const VALID_INCOME: IncomeInput = {
  source: 'Acme Corp Payroll',
  amount: 2500,
  date: '2026-03-01',
  frequency: 'BIWEEKLY',
}

describe('validateIncomeInput', () => {
  it('accepts a well-formed income entry', () => {
    const result = validateIncomeInput(VALID_INCOME)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects a negative amount', () => {
    const result = validateIncomeInput({ ...VALID_INCOME, amount: -100 })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/amount/i)
  })

  it('rejects a zero amount', () => {
    const result = validateIncomeInput({ ...VALID_INCOME, amount: 0 })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/amount/i)
  })

  it('rejects a missing date', () => {
    const result = validateIncomeInput({ ...VALID_INCOME, date: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/date/i)
  })

  it('rejects an unparseable date', () => {
    const result = validateIncomeInput({ ...VALID_INCOME, date: 'not-a-date' })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/date/i)
  })

  it('rejects an invalid frequency enum value', () => {
    const result = validateIncomeInput({ ...VALID_INCOME, frequency: 'YEARLY' })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/frequency/i)
  })

  it('rejects a missing/blank source', () => {
    const result = validateIncomeInput({ ...VALID_INCOME, source: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/source/i)
  })

  it('accepts every documented frequency enum value', () => {
    for (const frequency of ['ONE_TIME', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']) {
      const result = validateIncomeInput({ ...VALID_INCOME, frequency })
      expect(result.valid).toBe(true)
    }
  })

  it('accumulates multiple errors for a payload with several problems', () => {
    const result = validateIncomeInput({
      source: '',
      amount: -50,
      date: '',
      frequency: 'YEARLY',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})
