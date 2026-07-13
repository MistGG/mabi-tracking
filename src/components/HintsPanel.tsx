import { useState } from 'react'
import type { WikiSearchResult } from '../types'
import { loadHintsMinimized, saveHintsMinimized } from '../lib/storage'

export const HINT_ITEMS: Array<{
  item: WikiSearchResult
  blurb: string
}> = [
  {
    item: {
      title: 'Gold',
      url: 'https://wiki.mabinogiworld.com/view/Gold',
    },
    blurb:
      'Log cash/gold gained outside the auction house. Tax exempt, no Δ Unit / Δ Net.',
  },
  {
    item: {
      title: 'Fynni Pet Whistle',
      url: 'https://wiki.mabinogiworld.com/view/Fynni_Pet_Whistle',
    },
    blurb:
      'For Fynni Pet Whistle farming. Prefills 40,000 × 30, tax exempt, no Δ Unit / Δ Net.',
  },
]

const LEDGER_REFILL_TIP =
  'Click an item name in the ledger to refill the log form so you can re-enter sales faster.'

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
    <section
      className={`hints-panel${minimized ? ' hints-minimized' : ''}`}
      aria-label="Helpful tips"
    >
      <header className="hints-header">
        <h3>Helpful Tips</h3>
        <button
          type="button"
          className="btn ghost compact"
          onClick={toggleMinimized}
          aria-expanded={!minimized}
          aria-controls="hints-body"
        >
          {minimized ? 'Expand' : 'Minimize'}
        </button>
      </header>

      {minimized ? (
        <p id="hints-body" className="hints-compact">
          Quick picks:{' '}
          {HINT_ITEMS.map((hint, i) => (
            <span key={hint.item.title}>
              {i > 0 && ', '}
              <button
                type="button"
                className="hint-link"
                onClick={() => onPick(hint.item)}
              >
                {hint.item.title}
              </button>
            </span>
          ))}
        </p>
      ) : (
        <ul id="hints-body" className="hints-list">
          {HINT_ITEMS.map((hint) => (
            <li key={hint.item.title}>
              <button
                type="button"
                className="hint-chip"
                onClick={() => onPick(hint.item)}
              >
                {hint.item.title}
              </button>
              <p>{hint.blurb}</p>
            </li>
          ))}
          <li className="hint-tip">
            <span className="hint-chip hint-chip-static">Ledger</span>
            <p>{LEDGER_REFILL_TIP}</p>
          </li>
        </ul>
      )}
    </section>
  )
}
