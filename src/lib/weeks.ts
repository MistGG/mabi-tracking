import type { DailyProfit } from '../types'
import { formatDisplayDate, todayIso } from './finance'

export type ProfitWeek = {
  /** Monday ISO date of this week */
  id: string
  start: string
  end: string
  label: string
  days: DailyProfit[]
  weekNet: number
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday of the ISO week containing `iso`. */
export function weekStartMonday(iso: string): string {
  const d = parseIso(iso)
  const day = d.getDay() // 0 Sun … 6 Sat
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return toIso(d)
}

function addDays(iso: string, days: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

function emptyDay(date: string): DailyProfit {
  return { date, gross: 0, tax: 0, net: 0, entryCount: 0 }
}

function weekLabel(start: string, end: string): string {
  const startLabel = formatDisplayDate(start)
  const endLabel = formatDisplayDate(end)
  return `${startLabel} – ${endLabel}`
}

/**
 * Group daily profits into Mon–Sun weeks (newest first).
 * Each week always has 7 day slots (zeros for days without sales).
 */
export function buildProfitWeeks(daily: DailyProfit[]): ProfitWeek[] {
  const byDate = new Map(daily.map((d) => [d.date, d]))
  const weekIds = new Set<string>()

  for (const d of daily) {
    weekIds.add(weekStartMonday(d.date))
  }

  // Always include the current week so the chart has a home even with no sales yet
  weekIds.add(weekStartMonday(todayIso()))

  const weeks: ProfitWeek[] = [...weekIds]
    .sort((a, b) => b.localeCompare(a))
    .map((start) => {
      const end = addDays(start, 6)
      const days: DailyProfit[] = []
      for (let i = 0; i < 7; i++) {
        const date = addDays(start, i)
        days.push(byDate.get(date) ?? emptyDay(date))
      }
      const weekNet = days.reduce((sum, d) => sum + d.net, 0)
      return {
        id: start,
        start,
        end,
        label: weekLabel(start, end),
        days,
        weekNet,
      }
    })

  return weeks
}

export function defaultWeekId(weeks: ProfitWeek[]): string {
  const todayWeek = weekStartMonday(todayIso())
  if (weeks.some((w) => w.id === todayWeek)) return todayWeek
  return weeks[0]?.id ?? todayWeek
}
