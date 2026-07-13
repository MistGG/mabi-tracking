import { useEffect, useMemo, useState } from 'react'
import { formatGold, parseNumberInput, todayIso } from '../lib/finance'
import {
  loadGoldPickupMinimized,
  loadStartGold,
  saveGoldPickupMinimized,
  saveStartGold,
} from '../lib/storage'

type Props = {
  onApply: (gained: number) => void
}

function initialStartGold(): string {
  const saved = loadStartGold()
  return saved != null ? formatGold(saved) : '0'
}

export function GoldPickupPanel({ onApply }: Props) {
  const [minimized, setMinimized] = useState(loadGoldPickupMinimized)
  const [startGold, setStartGold] = useState(initialStartGold)
  const [endGold, setEndGold] = useState('0')
  const [, setGoldDay] = useState(todayIso)

  useEffect(() => {
    const refreshForNewDay = () => {
      const today = todayIso()
      setGoldDay((prev) => {
        if (prev === today) return prev
        setStartGold('0')
        setEndGold('0')
        saveStartGold(null)
        return today
      })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshForNewDay()
    }
    window.addEventListener('focus', refreshForNewDay)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refreshForNewDay)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const startNum = parseNumberInput(startGold)
  const endNum = parseNumberInput(endGold)
  const gained = useMemo(() => {
    if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) return null
    if (startNum < 0 || endNum < 0) return null
    return endNum - startNum
  }, [startNum, endNum])

  const canApply = gained != null && gained > 0

  function toggleMinimized() {
    setMinimized((prev) => {
      const next = !prev
      saveGoldPickupMinimized(next)
      return next
    })
  }

  function handleApply() {
    if (!canApply || gained == null) return
    saveStartGold(endNum)
    setStartGold(formatGold(endNum))
    setEndGold('0')
    setGoldDay(todayIso())
    onApply(gained)
  }

  function handleStartBlur() {
    if (!Number.isFinite(startNum) || startNum < 0) {
      setStartGold('0')
      saveStartGold(null)
      return
    }
    setStartGold(formatGold(startNum))
    saveStartGold(startNum)
    setGoldDay(todayIso())
  }

  return (
    <section
      className={`gold-pickup${minimized ? ' gold-pickup-minimized' : ''}`}
      aria-label="Gold pickup calculator"
    >
      <header className="gold-pickup-header form-header-row">
        <div>
          <h3>Gold pickup</h3>
          {!minimized && (
            <p>Start gold vs end-of-day gold → fill a Gold entry.</p>
          )}
        </div>
        <button
          type="button"
          className="btn ghost compact"
          onClick={toggleMinimized}
          aria-expanded={!minimized}
          aria-controls="gold-pickup-body"
        >
          {minimized ? 'Expand' : 'Minimize'}
        </button>
      </header>

      {minimized ? (
        <p id="gold-pickup-body" className="gold-pickup-compact">
          Track raw gold gained today. Expand to enter current and end-of-day
          gold.
        </p>
      ) : (
        <div id="gold-pickup-body">
          <div className="gold-pickup-grid">
            <div className="field">
              <label htmlFor="start-gold">Current gold</label>
              <input
                id="start-gold"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={startGold}
                onChange={(e) => setStartGold(e.target.value)}
                onBlur={handleStartBlur}
              />
            </div>
            <div className="field">
              <label htmlFor="end-gold">End of day gold</label>
              <input
                id="end-gold"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={endGold}
                onChange={(e) => setEndGold(e.target.value)}
              />
            </div>
            <div className="field gold-pickup-gained">
              <span className="gold-pickup-gained-label" id="gold-gained-label">
                Gained
              </span>
              <div
                className="gold-pickup-gained-row"
                aria-labelledby="gold-gained-label"
              >
                <strong>
                  {gained == null
                    ? '—'
                    : gained > 0
                      ? formatGold(gained)
                      : gained === 0
                        ? '0'
                        : formatGold(gained)}
                </strong>
                <button
                  type="button"
                  className="btn ghost compact"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Fill
                </button>
              </div>
            </div>
          </div>
          {gained != null && gained < 0 && (
            <p className="field-error">
              End gold is lower than current gold. Check your numbers.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
