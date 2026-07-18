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

export type ContentState = {
  activities: ContentActivity[]
  /** YYYY-MM-DD for the active daily period. */
  dailyKey: string
  /** Monday YYYY-MM-DD for the active weekly period. */
  weeklyKey: string
}

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
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff)
  return dateKey(monday)
}

export function emptyContentState(): ContentState {
  return {
    activities: [],
    dailyKey: dateKey(),
    weeklyKey: weekKey(),
  }
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

/** Reset expired daily/weekly counters. */
export function applyPeriodResets(state: ContentState): ContentState {
  const today = dateKey()
  const thisWeek = weekKey()
  let changed = false
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
  if (!changed && state.dailyKey === today && state.weeklyKey === thisWeek) {
    return state
  }
  return {
    activities,
    dailyKey: today,
    weeklyKey: thisWeek,
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
