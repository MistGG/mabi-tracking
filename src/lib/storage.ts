import type { IncomeEntry } from '../types'
import { SOLD_BY_DEFAULT_KEY, STORAGE_KEY } from '../types'

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

export function loadSoldByDefault(): boolean {
  try {
    const raw = localStorage.getItem(SOLD_BY_DEFAULT_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

export function saveSoldByDefault(value: boolean): void {
  try {
    localStorage.setItem(SOLD_BY_DEFAULT_KEY, String(value))
  } catch {
    // ignore write failures (e.g. storage disabled)
  }
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
