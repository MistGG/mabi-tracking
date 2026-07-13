import { formatGold } from '../lib/finance'
import { MARKET_TAX_RATE } from '../types'

type Props = {
  todayNet: number
  todayGross: number
  todayTax: number
  todaySpent: number
  totalNet: number
  totalGross: number
  totalTax: number
  totalSpent: number
  count: number
  expenditureCount: number
  onClear: () => void
}

export function SummaryBar({
  todayNet,
  todayGross,
  todayTax,
  todaySpent,
  totalNet,
  totalGross,
  totalTax,
  totalSpent,
  count,
  expenditureCount,
  onClear,
}: Props) {
  const hasAnything = count > 0 || expenditureCount > 0

  return (
    <section className="summary-bar">
      <div
        className={`stat featured${todayNet < 0 ? ' featured-negative' : ''}`}
      >
        <span className="stat-label">Today (net)</span>
        <strong className="stat-value">{formatGold(todayNet)}</strong>
        <span className="stat-sub">
          {formatGold(todayGross)} gross − {formatGold(todayTax)} tax
          {todaySpent > 0 ? ` − ${formatGold(todaySpent)} spent` : ''}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">All-time net</span>
        <strong className="stat-value">{formatGold(totalNet)}</strong>
        <span className="stat-sub">
          {formatGold(totalGross)} gross · {formatGold(totalTax)} tax (
          {MARKET_TAX_RATE * 100}%)
          {totalSpent > 0 ? ` · ${formatGold(totalSpent)} spent` : ''}
        </span>
      </div>
      <div className="stat actions">
        <span className="stat-label">
          {count} logged sale{count === 1 ? '' : 's'}
          {expenditureCount > 0
            ? ` · ${expenditureCount} spend${expenditureCount === 1 ? '' : 's'}`
            : ''}
        </span>
        <button
          type="button"
          className="btn ghost"
          disabled={!hasAnything}
          onClick={() => {
            if (
              hasAnything &&
              window.confirm(
                'Clear all saved sales and expenditures from this browser?',
              )
            ) {
              onClear()
            }
          }}
        >
          Clear cache
        </button>
      </div>
    </section>
  )
}
