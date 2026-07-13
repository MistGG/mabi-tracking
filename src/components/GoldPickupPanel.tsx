import { useEffect, useMemo, useState } from 'react'
import { formatGold, parseNumberInput, todayIso } from '../lib/finance'
import {
  loadGoldPickupMinimized,
  loadStartGold,
  saveGoldPickupMinimized,
  saveStartGold,
} from '../lib/storage'

type Props = {
  onGain: (gained: number) => void
  onSpend: (spent: number) => void
}

function initialStartGold(): string {
  const saved = loadStartGold()
  return saved != null ? formatGold(saved) : '0'
}

export function GoldPickupPanel({ onGain, onSpend }: Props) {
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
  const delta = useMemo(() => {
    if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) return null
    if (startNum < 0 || endNum < 0) return null
    return endNum - startNum
  }, [startNum, endNum])

  const canApply = delta != null && delta !== 0

  function toggleMinimized() {
    setMinimized((prev) => {
      const next = !prev
      saveGoldPickupMinimized(next)
      return next
    })
  }

  function handleApply() {
    if (!canApply || delta == null) return
    saveStartGold(endNum)
    setStartGold(formatGold(endNum))
    setEndGold('0')
    setGoldDay(todayIso())
    if (delta > 0) onGain(delta)
    else onSpend(-delta)
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

  const deltaLabel =
    delta == null ? 'Change' : delta < 0 ? 'Spent' : 'Gained'

  return (
    <section
      className={`gold-pickup${minimized ? ' gold-pickup-minimized' : ''}`}
      aria-label="Gold pickup calculator"
    >
      <header className="gold-pickup-header form-header-row">
        <div>
          <h3>Gold pickup</h3>
          {!minimized && (
            <p>
              Start vs end-of-day gold → fill a Gold sale, or a Gold spend if
              lower.
            </p>
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
          Track gold gained or spent today. Expand to enter current and
          end-of-day gold.
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
              <span className="gold-pickup-gained-label" id="gold-delta-label">
                {deltaLabel}
              </span>
              <div
                className="gold-pickup-gained-row"
                aria-labelledby="gold-delta-label"
              >
                <strong
                  className={
                    delta != null && delta < 0 ? 'gold-pickup-spent' : undefined
                  }
                >
                  {delta == null
                    ? '—'
                    : delta === 0
                      ? '0'
                      : delta > 0
                        ? formatGold(delta)
                        : `−${formatGold(-delta)}`}
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
        </div>
      )}
    </section>
  )
}
