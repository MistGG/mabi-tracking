import type { IncomeEntry } from '../types'
import { STORAGE_KEY } from '../types'

export function loadEntries(): IncomeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry)
  } catch {
    return []
  }
}

export function saveEntries(entries: IncomeEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function isValidEntry(value: unknown): value is IncomeEntry {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.itemName === 'string' &&
    typeof e.wikiUrl === 'string' &&
    typeof e.pricePerUnit === 'number' &&
    typeof e.quantity === 'number' &&
    typeof e.date === 'string' &&
    typeof e.createdAt === 'number' &&
    (e.taxExempt === undefined || typeof e.taxExempt === 'boolean') &&
    (e.sold === undefined || typeof e.sold === 'boolean')
  )
}
