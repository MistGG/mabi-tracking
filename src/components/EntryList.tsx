import type { IncomeEntry } from '../types'
import { formatDisplayDate, formatGold, hasUniqueValue } from '../lib/finance'
import {
  buildDayGroups,
  deltaClass,
  formatDelta,
} from '../lib/ledger'

type Props = {
  entries: IncomeEntry[]
  onRemove: (id: string) => void
  onSelectItem: (entry: IncomeEntry) => void
  onToggleSold: (id: string, sold: boolean) => void
  onRelist: (entry: IncomeEntry) => void
}

export function EntryList({
  entries,
  onRemove,
  onSelectItem,
  onToggleSold,
  onRelist,
}: Props) {
  if (entries.length === 0) {
    return (
      <section className="panel entry-list">
        <header className="panel-header">
          <h2>Ledger</h2>
          <p>Your sales will appear here and stay cached in this browser.</p>
        </header>
        <div className="empty-ledger">
          <p>No entries yet. Search an item and log your first sale.</p>
        </div>
      </section>
    )
  }

  const groups = buildDayGroups(entries)

  return (
    <section className="panel entry-list">
      <header className="panel-header">
        <h2>Ledger</h2>
        <p>
          {entries.length} sale{entries.length === 1 ? '' : 's'} by day · totals
          count sold entries only
        </p>
      </header>

      <div className="day-groups">
        {groups.map((group) => (
          <section key={group.date} className="day-group">
            <header className="day-group-header">
              <h3>{formatDisplayDate(group.date)}</h3>
              <div className="day-group-totals">
                <span>
                  Net <strong>{formatGold(group.dayNet)}</strong>
                </span>
                <span className="day-group-sub">
                  {formatGold(group.dayGross)} gross · {formatGold(group.dayTax)}{' '}
                  tax
                </span>
              </div>
            </header>

            <div className="table-scroll">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Gross</th>
                    <th scope="col">Net</th>
                    <th scope="col">Δ Unit</th>
                    <th scope="col">Δ Net</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((row) => {
                    const unique = hasUniqueValue(row.entry)
                    const pending = !row.sold
                    return (
                      <tr
                        key={row.entry.id}
                        className={`ledger-row-clickable${
                          pending ? ' ledger-row-pending' : ''
                        }`}
                        onClick={() => onSelectItem(row.entry)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelectItem(row.entry)
                          }
                        }}
                        tabIndex={0}
                        title="Fill this item in the sale form"
                      >
                        <td>
                          <div className="table-item">
                            {row.entry.imageUrl ? (
                              <img
                                src={row.entry.imageUrl}
                                alt=""
                                width={28}
                                height={28}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="item-fallback sm" aria-hidden>
                                ◆
                              </div>
                            )}
                            <span className="item-name">
                              {row.entry.itemName}
                            </span>
                            {pending && (
                              <span className="pending-badge">pending</span>
                            )}
                          </div>
                        </td>
                        <td>{row.entry.quantity}</td>
                        <td className={unique ? 'money-blank' : undefined}>
                          {unique ? '—' : formatGold(row.entry.pricePerUnit)}
                        </td>
                        <td className={unique ? 'money-blank' : undefined}>
                          {unique ? '—' : formatGold(row.gross)}
                        </td>
                        <td
                          className={
                            unique
                              ? 'money-blank'
                              : pending
                                ? 'net-cell net-pending'
                                : 'net-cell'
                          }
                        >
                          {unique ? '—' : formatGold(row.net)}
                        </td>
                        <td className={deltaClass(unique ? null : row.priceDelta)}>
                          {unique ? '—' : formatDelta(row.priceDelta)}
                          {!unique && row.previous && (
                            <span className="delta-hint">
                              was {formatGold(row.previous.pricePerUnit)}
                            </span>
                          )}
                        </td>
                        <td className={deltaClass(unique ? null : row.netDelta)}>
                          {unique ? '—' : formatDelta(row.netDelta)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button
                              type="button"
                              className={`btn ghost compact${
                                row.sold ? ' sold-on' : ''
                              }`}
                              aria-pressed={row.sold}
                              onClick={() =>
                                onToggleSold(row.entry.id, !row.sold)
                              }
                              title={
                                row.sold
                                  ? 'Marked sold — click to set pending'
                                  : 'Mark as sold to count it in totals'
                              }
                            >
                              {row.sold ? 'Sold ✓' : 'Sold?'}
                            </button>
                            <button
                              type="button"
                              className="btn ghost compact"
                              onClick={() => onRelist(row.entry)}
                              title="Remove this entry and refill the form to relist"
                            >
                              Relist
                            </button>
                            <button
                              type="button"
                              className="btn ghost danger compact"
                              onClick={() => onRemove(row.entry.id)}
                              aria-label={`Remove ${row.entry.itemName}`}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
