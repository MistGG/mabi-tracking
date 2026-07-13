/** Initial window for ledger / expenditure history lists. */
export const INITIAL_VISIBLE_DAYS = 7

/** Unique ISO dates, newest first. */
export function uniqueDatesDesc(dates: Iterable<string>): string[] {
  return [...new Set(dates)].sort((a, b) => b.localeCompare(a))
}

export function visibleDateSet(
  datesDesc: string[],
  visibleDayCount: number,
): Set<string> {
  if (visibleDayCount >= datesDesc.length) return new Set(datesDesc)
  return new Set(datesDesc.slice(0, Math.max(0, visibleDayCount)))
}

export function nextVisibleDayCount(
  current: number,
  add: number,
  total: number,
): number {
  if (!Number.isFinite(add) || add === Number.POSITIVE_INFINITY) return total
  return Math.min(total, current + add)
}
