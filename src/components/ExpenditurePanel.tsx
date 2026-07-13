import { useEffect, useState, type FormEvent } from 'react'
import type { Expenditure } from '../types'
import {
  formatDisplayDate,
  formatGold,
  parseNumberInput,
  todayIso,
} from '../lib/finance'

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

  const sorted = [...expenditures].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.createdAt - a.createdAt
  })

  return (
    <section className="panel expenditure-panel">
      <header className="panel-header">
        <h2>Expenditures</h2>
        <p>Log gold spent outside sales. These reduce your net totals.</p>
      </header>

      <form className="expenditure-form" onSubmit={handleSubmit}>
        <div className="expenditure-grid">
          <div className="field expenditure-comment">
            <label htmlFor="spend-comment">Comment</label>
            <input
              id="spend-comment"
              type="text"
              autoComplete="off"
              placeholder="e.g. Dye ampule, repair bill"
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
        <ul className="expenditure-list">
          {sorted.map((item) => (
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
      )}
    </section>
  )
}
