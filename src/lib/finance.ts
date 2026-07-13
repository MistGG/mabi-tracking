import type { IncomeEntry } from '../types'
import { MARKET_TAX_RATE } from '../types'

export function calcGross(pricePerUnit: number, quantity: number): number {
  return pricePerUnit * quantity
}

export function calcTax(gross: number, taxExempt = false): number {
  if (taxExempt) return 0
  return gross * MARKET_TAX_RATE
}

export function calcNet(gross: number, taxExempt = false): number {
  return gross - calcTax(gross, taxExempt)
}

export function entryGross(entry: IncomeEntry): number {
  return calcGross(entry.pricePerUnit, entry.quantity)
}

export function entryTax(entry: IncomeEntry): number {
  return calcTax(entryGross(entry), entry.taxExempt === true)
}

export function entryNet(entry: IncomeEntry): number {
  return calcNet(entryGross(entry), entry.taxExempt === true)
}

export function formatGold(value: number): string {
  const rounded = Math.round(value)
  return rounded.toLocaleString('en-US')
}

export function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
