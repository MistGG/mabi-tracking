import type { IncomeEntry } from '../types'
import { todayIso } from './finance'

export type RetrackGoods = {
  date: string
  items: IncomeEntry[]
}

/** Prefer the latest day before today; otherwise the most recent tracked day. */
export function getLastTrackedDayGoods(
  entries: IncomeEntry[],
): RetrackGoods | null {
  if (entries.length === 0) return null

  const today = todayIso()
  let latestBeforeToday: string | null = null
  let latestAny = entries[0].date

  for (const entry of entries) {
    if (entry.date > latestAny) latestAny = entry.date
    if (entry.date < today) {
      if (!latestBeforeToday || entry.date > latestBeforeToday) {
        latestBeforeToday = entry.date
      }
    }
  }

  const sourceDate = latestBeforeToday ?? latestAny

  const dayEntries = entries
    .filter((e) => e.date === sourceDate)
    .sort((a, b) => b.createdAt - a.createdAt)

  const seen = new Set<string>()
  const items: IncomeEntry[] = []
  for (const entry of dayEntries) {
    const key = entry.itemName.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push(entry)
  }

  items.sort((a, b) => a.itemName.localeCompare(b.itemName))

  return { date: sourceDate, items }
}

export function itemLoggedOnDate(
  entries: IncomeEntry[],
  itemName: string,
  date: string,
): boolean {
  const key = itemName.toLowerCase()
  return entries.some(
    (e) => e.date === date && e.itemName.toLowerCase() === key,
  )
}
