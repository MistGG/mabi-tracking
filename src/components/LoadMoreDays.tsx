import { nextVisibleDayCount } from '../lib/dayWindow'

type Props = {
  visibleDays: number
  totalDays: number
  onChange: (nextVisibleDays: number) => void
}

export function LoadMoreDays({ visibleDays, totalDays, onChange }: Props) {
  if (totalDays <= visibleDays) return null

  const remaining = totalDays - visibleDays

  return (
    <div className="load-more">
      <p className="load-more-status">
        Showing {visibleDays} of {totalDays} day
        {totalDays === 1 ? '' : 's'}
        {remaining > 0 ? ` · ${remaining} older hidden` : ''}
      </p>
      <div className="load-more-actions">
        <button
          type="button"
          className="btn ghost compact"
          onClick={() =>
            onChange(nextVisibleDayCount(visibleDays, 7, totalDays))
          }
        >
          7 more days
        </button>
        <button
          type="button"
          className="btn ghost compact"
          onClick={() =>
            onChange(nextVisibleDayCount(visibleDays, 30, totalDays))
          }
        >
          30 more days
        </button>
        <button
          type="button"
          className="btn ghost compact"
          onClick={() => onChange(totalDays)}
        >
          All data
        </button>
      </div>
    </div>
  )
}
