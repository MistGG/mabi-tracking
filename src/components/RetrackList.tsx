import type { IncomeEntry } from '../types'
import { formatDisplayDate, formatGold } from '../lib/finance'
import { itemLoggedOnDate } from '../lib/retrack'

type Props = {
  sourceDate: string
  items: IncomeEntry[]
  targetDate: string
  allEntries: IncomeEntry[]
  onPick: (entry: IncomeEntry) => void
}

export function RetrackList({
  sourceDate,
  items,
  targetDate,
  allEntries,
  onPick,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="retrack-empty">
        <p>No sales on the last tracked day yet.</p>
      </div>
    )
  }

  return (
    <div className="retrack-panel">
      <p className="retrack-hint">
        Goods from {formatDisplayDate(sourceDate)}. Tap one to fill the form,
        then adjust price or amount if needed.
      </p>
      <ul className="retrack-list">
        {items.map((entry) => {
          const alreadyLogged = itemLoggedOnDate(
            allEntries,
            entry.itemName,
            targetDate,
          )
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`retrack-item${alreadyLogged ? ' logged' : ''}`}
                onClick={() => onPick(entry)}
              >
                {entry.imageUrl ? (
                  <img
                    src={entry.imageUrl}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="item-fallback sm" aria-hidden>
                    ◆
                  </div>
                )}
                <span className="retrack-item-body">
                  <span className="item-name">{entry.itemName}</span>
                  <span className="retrack-meta">
                    {formatGold(entry.pricePerUnit)} × {entry.quantity}
                  </span>
                </span>
                {alreadyLogged ? (
                  <span className="retrack-badge logged">logged</span>
                ) : (
                  <span className="retrack-badge">use</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
