import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Expenditure } from '../types'
import {
  formatDisplayDate,
  formatGold,
  parseNumberInput,
  todayIso,
} from '../lib/finance'
import {
  INITIAL_VISIBLE_DAYS,
  uniqueDatesDesc,
  visibleDateSet,
} from '../lib/dayWindow'
import {
  loadExpendituresMinimized,
  saveExpendituresMinimized,
} from '../lib/storage'
import { LoadMoreDays } from './LoadMoreDays'

type Props = {
  expenditures: Expenditure[]
  onAdd: (input: Omit<Expenditure, 'id' | 'createdAt'>) => void
  onRemove: (id: string) => void
}

export function ExpenditurePanel({
  expenditures,
  onAdd,
  onRemove,
}: Props) {
  const [comment, setComment] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [error, setError] = useState<string | null>(null)
  const [visibleDays, setVisibleDays] = useState(INITIAL_VISIBLE_DAYS)
  const [minimized, setMinimized] = useState(loadExpendituresMinimized)

  useEffect(() => {
    const refreshStaleDate = () => {
      setDate((current) => (current < todayIso() ? todayIso() : current))
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshStaleDate()
    }
    window.addEventListener('focus', refreshStaleDate)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refreshStaleDate)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function toggleMinimized() {
    setMinimized((prev) => {
      const next = !prev
      saveExpendituresMinimized(next)
      return next
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = comment.trim()
    const spent = parseNumberInput(amount)
    if (!trimmed) {
      setError('Add a short comment for this spend.')
      return
    }
    if (!Number.isFinite(spent) || spent <= 0) {
      setError('Enter how much gold you spent.')
      return
    }
    if (!date) {
      setError('Pick a date.')
      return
    }

    onAdd({
      comment: trimmed,
      amount: Math.round(spent),
      date,
    })
    setComment('')
    setAmount('')
    setDate(todayIso())
    setError(null)
  }

  const sorted = useMemo(
    () =>
      [...expenditures].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date)
        if (byDate !== 0) return byDate
        return b.createdAt - a.createdAt
      }),
    [expenditures],
  )

  const totalSpent = useMemo(
    () => expenditures.reduce((sum, item) => sum + item.amount, 0),
    [expenditures],
  )

  const allDates = useMemo(
    () => uniqueDatesDesc(sorted.map((item) => item.date)),
    [sorted],
  )
  const totalDays = allDates.length
  const shownDays = Math.min(visibleDays, totalDays)
  const visibleDates = useMemo(
    () => visibleDateSet(allDates, shownDays),
    [allDates, shownDays],
  )
  const visibleItems = useMemo(
    () => sorted.filter((item) => visibleDates.has(item.date)),
    [sorted, visibleDates],
  )

  return (
    <section
      className={`panel expenditure-panel${
        minimized ? ' expenditure-minimized' : ''
      }`}
    >
      <header className="panel-header form-header-row">
        <div>
          <h2>Expenditures</h2>
          {!minimized && (
            <p>Log gold spent outside sales. These reduce your net totals.</p>
          )}
        </div>
        <button
          type="button"
          className="btn ghost compact"
          onClick={toggleMinimized}
          aria-expanded={!minimized}
          aria-controls="expenditure-body"
        >
          {minimized ? 'Expand' : 'Minimize'}
        </button>
      </header>

      {minimized ? (
        <div id="expenditure-body" className="expenditure-compact">
          {expenditures.length === 0 ? (
            <p className="expenditure-compact-empty">
              No spends logged. Expand to add one.
            </p>
          ) : (
            <>
              <strong className="expenditure-compact-total">
                −{formatGold(totalSpent)}
              </strong>
              <span className="expenditure-compact-meta">
                {expenditures.length} spend
                {expenditures.length === 1 ? '' : 's'} logged
              </span>
            </>
          )}
        </div>
      ) : (
        <div id="expenditure-body">
          <form className="expenditure-form" onSubmit={handleSubmit}>
            <div className="expenditure-grid">
              <div className="field expenditure-comment">
                <label htmlFor="spend-comment">Comment</label>
                <input
                  id="spend-comment"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Dye ampule, passes"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="spend-amount">Spent</label>
                <input
                  id="spend-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="spend-date">Date</label>
                <input
                  id="spend-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="field-error">{error}</p>}

            <button className="btn primary" type="submit">
              Add expenditure
            </button>
          </form>

          {sorted.length === 0 ? (
            <p className="expenditure-empty">No expenditures logged yet.</p>
          ) : (
            <>
              <ul className="expenditure-list">
                {visibleItems.map((item) => (
                  <li key={item.id} className="expenditure-row">
                    <div className="expenditure-row-main">
                      <strong>{item.comment}</strong>
                      <span className="expenditure-row-meta">
                        {formatDisplayDate(item.date)}
                      </span>
                    </div>
                    <strong className="expenditure-amount">
                      −{formatGold(item.amount)}
                    </strong>
                    <button
                      type="button"
                      className="btn ghost compact danger"
                      onClick={() => onRemove(item.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <LoadMoreDays
                visibleDays={shownDays}
                totalDays={totalDays}
                onChange={setVisibleDays}
              />
            </>
          )}
        </div>
      )}
    </section>
  )
}
