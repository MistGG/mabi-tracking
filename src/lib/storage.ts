import type { IncomeEntry } from '../types'
import {
  GOAL_AMOUNT_KEY,
  GOAL_MINIMIZED_KEY,
  SOLD_BY_DEFAULT_KEY,
  STORAGE_KEY,
} from '../types'

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

export function loadGoalAmount(): number | null {
  try {
    const raw = localStorage.getItem(GOAL_AMOUNT_KEY)
    if (raw === null || raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function saveGoalAmount(value: number | null): void {
  try {
    if (value == null || !Number.isFinite(value) || value <= 0) {
      localStorage.removeItem(GOAL_AMOUNT_KEY)
      return
    }
    localStorage.setItem(GOAL_AMOUNT_KEY, String(Math.round(value)))
  } catch {
    // ignore write failures
  }
}

export function loadGoalMinimized(): boolean {
  try {
    const raw = localStorage.getItem(GOAL_MINIMIZED_KEY)
    if (raw === null) return false
    return raw === 'true'
  } catch {
    return false
  }
}

export function saveGoalMinimized(value: boolean): void {
  try {
    localStorage.setItem(GOAL_MINIMIZED_KEY, String(value))
  } catch {
    // ignore write failures
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
