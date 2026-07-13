import { useState } from 'react'
import type { WikiSearchResult } from '../types'
import { FYNNI_ITEM, GOLD_ITEM } from '../lib/specialItems'
import { loadHintsMinimized, saveHintsMinimized } from '../lib/storage'

export const HINT_ITEMS: Array<{
  item: WikiSearchResult
  blurb: string
}> = [
  {
    item: GOLD_ITEM,
    blurb:
      'Cash/gold outside AH. Use Gold pickup, or enter manually. Tax exempt, no Δ Unit / Δ Net.',
  },
  {
    item: FYNNI_ITEM,
    blurb:
      'Fynni farming. Prefills 40,000 × 30, tax exempt, no Δ Unit / Δ Net.',
  },
]

const LEDGER_REFILL_TIP =
  'Click a ledger item name to refill the log form for faster re-entry.'

type Props = {
  onPick: (item: WikiSearchResult) => void
}

export function HintsPanel({ onPick }: Props) {
  const [minimized, setMinimized] = useState(loadHintsMinimized)

  function toggleMinimized() {
    setMinimized((prev) => {
      const next = !prev
      saveHintsMinimized(next)
      return next
    })
  }

  return (
    <aside
      className={`panel hints-panel hints-side${
        minimized ? ' hints-minimized' : ''
      }`}
      aria-label="Helpful tips"
    >
      <header className="hints-header">
        <h3>Tips</h3>
        <button
          type="button"
          className="btn ghost compact"
          onClick={toggleMinimized}
          aria-expanded={!minimized}
          aria-controls="hints-body"
        >
          {minimized ? '+' : '−'}
        </button>
      </header>

        <div id="hints-body" className="hints-side-body">
          <div className="hints-side-picks">
            {HINT_ITEMS.map((hint) => (
              <button
                key={hint.item.title}
                type="button"
                className="hint-chip"
                onClick={() => onPick(hint.item)}
                title={hint.blurb}
              >
                {hint.item.title}
              </button>
            ))}
          </div>

          <ul className="hints-list">
            {HINT_ITEMS.map((hint) => (
              <li key={`${hint.item.title}-detail`}>
                <p>
                  <strong>{hint.item.title}.</strong> {hint.blurb}
                </p>
              </li>
            ))}
            <li className="hint-tip">
              <p>
                <strong>Ledger.</strong> {LEDGER_REFILL_TIP}
              </p>
            </li>
          </ul>
        </div>
    </aside>
  )
}
