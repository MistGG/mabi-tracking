import type { IncomeEntry } from '../types'
import { entryGross, entryNet } from './finance'

export type EntryWithDelta = {
  entry: IncomeEntry
  gross: number
  net: number
  tax: number
  /** Prior sale of the same item (any earlier day/time), if any */
  previous: IncomeEntry | null
  priceDelta: number | null
  netDelta: number | null
}

export type DayGroup = {
  date: string
  entries: EntryWithDelta[]
  dayGross: number
  dayNet: number
  dayTax: number
}

function sortChronological(entries: IncomeEntry[]): IncomeEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return a.createdAt - b.createdAt
  })
}

export function buildDayGroups(entries: IncomeEntry[]): DayGroup[] {
  const chronological = sortChronological(entries)
  const lastByItem = new Map<string, IncomeEntry>()
  const withDelta: EntryWithDelta[] = []

  for (const entry of chronological) {
    const key = entry.itemName.toLowerCase()
    const previous = lastByItem.get(key) ?? null
    const gross = entryGross(entry)
    const net = entryNet(entry)
    const tax = gross - net

    withDelta.push({
      entry,
      gross,
      net,
      tax,
      previous,
      priceDelta: previous
        ? entry.pricePerUnit - previous.pricePerUnit
        : null,
      netDelta: previous ? net - entryNet(previous) : null,
    })

    lastByItem.set(key, entry)
  }

  const byDate = new Map<string, EntryWithDelta[]>()
  for (const row of withDelta) {
    const list = byDate.get(row.entry.date) ?? []
    list.push(row)
    byDate.set(row.entry.date, list)
  }

  const groups: DayGroup[] = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => {
      const sorted = [...dayEntries].sort(
        (a, b) => b.entry.createdAt - a.entry.createdAt,
      )
      const dayGross = sorted.reduce((sum, r) => sum + r.gross, 0)
      const dayNet = sorted.reduce((sum, r) => sum + r.net, 0)
      return {
        date,
        entries: sorted,
        dayGross,
        dayNet,
        dayTax: dayGross - dayNet,
      }
    })

  return groups
}

export function formatDelta(value: number | null, suffix = ''): string {
  if (value === null) return 'new'
  if (value === 0) return `0${suffix}`
  const sign = value > 0 ? '+' : ''
  return `${sign}${Math.round(value).toLocaleString('en-US')}${suffix}`
}

export function deltaClass(value: number | null): string {
  if (value === null || value === 0) return 'delta-flat'
  return value > 0 ? 'delta-up' : 'delta-down'
}
