import { CONTENT_STORAGE_KEY } from '../types'

export type ContentCadence = 'daily' | 'weekly'

export type ContentActivity = {
  id: string
  title: string
  url: string
  cadence: ContentCadence
  maxRuns: number
  runs: number
}

export type ContentHistoryPoint = {
  /** Daily: YYYY-MM-DD. Weekly: Monday YYYY-MM-DD. */
  key: string
  /** Cleared runs / planned runs for that period, 0–100. */
  percent: number
}

export type ContentState = {
  activities: ContentActivity[]
  /** YYYY-MM-DD for the active daily period. */
  dailyKey: string
  /** Monday YYYY-MM-DD for the active weekly period. */
  weeklyKey: string
  dailyHistory: ContentHistoryPoint[]
  weeklyHistory: ContentHistoryPoint[]
}

const MAX_DAILY_HISTORY = 30
const MAX_WEEKLY_HISTORY = 16

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Local Monday of the week containing `date`. */
export function weekKey(date = new Date()): string {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + diff,
  )
  return dateKey(monday)
}

export function emptyContentState(): ContentState {
  return {
    activities: [],
    dailyKey: dateKey(),
    weeklyKey: weekKey(),
    dailyHistory: [],
    weeklyHistory: [],
  }
}

export function completionPercent(
  activities: ContentActivity[],
  cadence: ContentCadence,
): number {
  const rows = activities.filter((a) => a.cadence === cadence)
  if (rows.length === 0) return 0
  const max = rows.reduce((sum, a) => sum + a.maxRuns, 0)
  if (max <= 0) return 0
  const runs = rows.reduce((sum, a) => sum + a.runs, 0)
  return Math.round((runs / max) * 1000) / 10
}

function normalizeHistory(value: unknown): ContentHistoryPoint[] {
  if (!Array.isArray(value)) return []
  const rows: ContentHistoryPoint[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>
    if (typeof raw.key !== 'string' || !raw.key.trim()) continue
    const percent = Number(raw.percent)
    if (!Number.isFinite(percent)) continue
    rows.push({
      key: raw.key,
      percent: Math.max(0, Math.min(100, Math.round(percent * 10) / 10)),
    })
  }
  return rows
}

function upsertHistory(
  history: ContentHistoryPoint[],
  key: string,
  percent: number,
  limit: number,
): ContentHistoryPoint[] {
  const next = history.filter((row) => row.key !== key)
  next.push({
    key,
    percent: Math.max(0, Math.min(100, Math.round(percent * 10) / 10)),
  })
  next.sort((a, b) => a.key.localeCompare(b.key))
  return next.slice(-limit)
}

function normalizeActivity(value: unknown): ContentActivity | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  if (typeof raw.title !== 'string' || !raw.title.trim()) return null
  if (raw.cadence !== 'daily' && raw.cadence !== 'weekly') return null
  const maxRuns = Number(raw.maxRuns)
  if (!Number.isFinite(maxRuns) || maxRuns < 1) return null
  const cappedMax = Math.min(99, Math.floor(maxRuns))
  const runs = Number(raw.runs)
  const cappedRuns = Number.isFinite(runs)
    ? Math.max(0, Math.min(cappedMax, Math.floor(runs)))
    : 0
  return {
    id: raw.id,
    title: raw.title.trim(),
    url: typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : '',
    cadence: raw.cadence,
    maxRuns: cappedMax,
    runs: cappedRuns,
  }
}

/** Snapshot ending periods, then reset expired counters. */
export function applyPeriodResets(state: ContentState): ContentState {
  const today = dateKey()
  const thisWeek = weekKey()
  let dailyHistory = state.dailyHistory
  let weeklyHistory = state.weeklyHistory
  let changed =
    state.dailyKey !== today ||
    state.weeklyKey !== thisWeek ||
    false

  if (state.dailyKey !== today) {
    const hadDaily = state.activities.some((a) => a.cadence === 'daily')
    if (hadDaily) {
      dailyHistory = upsertHistory(
        dailyHistory,
        state.dailyKey,
        completionPercent(state.activities, 'daily'),
        MAX_DAILY_HISTORY,
      )
      changed = true
    }
  }

  if (state.weeklyKey !== thisWeek) {
    const hadWeekly = state.activities.some((a) => a.cadence === 'weekly')
    if (hadWeekly) {
      weeklyHistory = upsertHistory(
        weeklyHistory,
        state.weeklyKey,
        completionPercent(state.activities, 'weekly'),
        MAX_WEEKLY_HISTORY,
      )
      changed = true
    }
  }

  const activities = state.activities.map((activity) => {
    if (activity.cadence === 'daily' && state.dailyKey !== today) {
      changed = true
      return { ...activity, runs: 0 }
    }
    if (activity.cadence === 'weekly' && state.weeklyKey !== thisWeek) {
      changed = true
      return { ...activity, runs: 0 }
    }
    return activity
  })

  if (
    !changed &&
    state.dailyKey === today &&
    state.weeklyKey === thisWeek &&
    dailyHistory === state.dailyHistory &&
    weeklyHistory === state.weeklyHistory
  ) {
    return state
  }

  return {
    activities,
    dailyKey: today,
    weeklyKey: thisWeek,
    dailyHistory,
    weeklyHistory,
  }
}

/** Keep the current period’s completion % on the chart as the user marks runs. */
export function withCurrentHistory(state: ContentState): ContentState {
  const hasDaily = state.activities.some((a) => a.cadence === 'daily')
  const hasWeekly = state.activities.some((a) => a.cadence === 'weekly')
  return {
    ...state,
    dailyHistory: hasDaily
      ? upsertHistory(
          state.dailyHistory,
          state.dailyKey,
          completionPercent(state.activities, 'daily'),
          MAX_DAILY_HISTORY,
        )
      : state.dailyHistory,
    weeklyHistory: hasWeekly
      ? upsertHistory(
          state.weeklyHistory,
          state.weeklyKey,
          completionPercent(state.activities, 'weekly'),
          MAX_WEEKLY_HISTORY,
        )
      : state.weeklyHistory,
  }
}

function normalizeContent(parsed: Partial<ContentState>): ContentState {
  const base = emptyContentState()
  const activities = Array.isArray(parsed.activities)
    ? parsed.activities
        .map(normalizeActivity)
        .filter((row): row is ContentActivity => row !== null)
    : []
  return applyPeriodResets({
    activities,
    dailyKey:
      typeof parsed.dailyKey === 'string' && parsed.dailyKey
        ? parsed.dailyKey
        : base.dailyKey,
    weeklyKey:
      typeof parsed.weeklyKey === 'string' && parsed.weeklyKey
        ? parsed.weeklyKey
        : base.weeklyKey,
    dailyHistory: normalizeHistory(parsed.dailyHistory),
    weeklyHistory: normalizeHistory(parsed.weeklyHistory),
  })
}

export function loadContent(): ContentState {
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY)
    if (!raw) return emptyContentState()
    return normalizeContent(JSON.parse(raw) as Partial<ContentState>)
  } catch {
    return emptyContentState()
  }
}

export function saveContent(state: ContentState): void {
  try {
    localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write failures
  }
}

export function createActivityId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatDailyHistoryLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatWeeklyHistoryLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 6)
  const a = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${a}–${b}`
}
