import type { DailyProfit } from '../types'
import { formatDisplayDate, todayIso } from './finance'

export type GoalEstimate = {
  target: number
  current: number
  remaining: number
  progress: number
  reached: boolean
  avgDailyNet: number
  daysNeeded: number | null
  endDate: string | null
  sampleDays: number
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

function addDays(iso: string, days: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

/**
 * Average daily net from the most recent up-to-`windowDays` days that had sales.
 * Falls back to all days with sales when fewer exist.
 */
export function averageDailyNet(
  daily: DailyProfit[],
  windowDays = 7,
): { avg: number; sampleDays: number } {
  const withSales = daily
    .filter((d) => d.entryCount > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, windowDays)

  if (withSales.length === 0) return { avg: 0, sampleDays: 0 }

  const total = withSales.reduce((sum, d) => sum + d.net, 0)
  return { avg: total / withSales.length, sampleDays: withSales.length }
}

export function estimateGoal(
  target: number,
  currentNet: number,
  daily: DailyProfit[],
): GoalEstimate | null {
  if (!Number.isFinite(target) || target <= 0) return null

  const remaining = Math.max(0, target - currentNet)
  const progress = Math.min(1, currentNet / target)
  const reached = currentNet >= target
  const { avg, sampleDays } = averageDailyNet(daily)

  if (reached) {
    return {
      target,
      current: currentNet,
      remaining: 0,
      progress: 1,
      reached: true,
      avgDailyNet: avg,
      daysNeeded: 0,
      endDate: todayIso(),
      sampleDays,
    }
  }

  if (avg <= 0 || sampleDays === 0) {
    return {
      target,
      current: currentNet,
      remaining,
      progress,
      reached: false,
      avgDailyNet: avg,
      daysNeeded: null,
      endDate: null,
      sampleDays,
    }
  }

  const daysNeeded = Math.ceil(remaining / avg)
  return {
    target,
    current: currentNet,
    remaining,
    progress,
    reached: false,
    avgDailyNet: avg,
    daysNeeded,
    endDate: addDays(todayIso(), daysNeeded),
    sampleDays,
  }
}

export function formatGoalEndDate(iso: string): string {
  return formatDisplayDate(iso)
}
