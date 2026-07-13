import { formatGold } from '../lib/finance'
import { MARKET_TAX_RATE } from '../types'

type Props = {
  todayNet: number
  todayGross: number
  todayTax: number
  totalNet: number
  totalGross: number
  totalTax: number
  count: number
  onClear: () => void
}

export function SummaryBar({
  todayNet,
  todayGross,
  todayTax,
  totalNet,
  totalGross,
  totalTax,
  count,
  onClear,
}: Props) {
  return (
    <section className="summary-bar">
      <div className="stat featured">
        <span className="stat-label">Today (net)</span>
        <strong className="stat-value">{formatGold(todayNet)}</strong>
        <span className="stat-sub">
          {formatGold(todayGross)} gross − {formatGold(todayTax)} tax
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">All-time net</span>
        <strong className="stat-value">{formatGold(totalNet)}</strong>
        <span className="stat-sub">
          {formatGold(totalGross)} gross · {formatGold(totalTax)} tax (
          {MARKET_TAX_RATE * 100}%)
        </span>
      </div>
      <div className="stat actions">
        <span className="stat-label">{count} logged sale{count === 1 ? '' : 's'}</span>
        <button
          type="button"
          className="btn ghost"
          disabled={count === 0}
          onClick={() => {
            if (
              count > 0 &&
              window.confirm('Clear all saved sales from this browser?')
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
