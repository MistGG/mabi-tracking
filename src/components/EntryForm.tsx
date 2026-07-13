import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { DraftItem, IncomeEntry, WikiSearchResult } from '../types'
import {
  calcGross,
  calcNet,
  calcTax,
  formatGold,
  parseNumberInput,
  todayIso,
} from '../lib/finance'
import { getItemOverride } from '../lib/itemOverrides'
import { getLastTrackedDayGoods } from '../lib/retrack'
import { loadSoldByDefault, saveSoldByDefault } from '../lib/storage'
import { fetchItemImage } from '../lib/wiki'
import { ItemSearch } from './ItemSearch'
import { RetrackList } from './RetrackList'

type AddPayload = {
  itemName: string
  wikiUrl: string
  imageUrl?: string
  pricePerUnit: number
  quantity: number
  date: string
  taxExempt?: boolean
  sold?: boolean
}

type FormMode = 'log' | 'retrack'

type Props = {
  onAdd: (entry: AddPayload) => void
  draftItem?: DraftItem | null
  entries: IncomeEntry[]
}

function applyItemDefaults(item: WikiSearchResult | null) {
  const override = item ? getItemOverride(item.title) : undefined
  return {
    price:
      override?.defaultPricePerUnit != null
        ? formatGold(override.defaultPricePerUnit)
        : '',
    quantity:
      override?.defaultQuantity != null
        ? formatGold(override.defaultQuantity)
        : '1',
  }
}

function applyDraft(draft: DraftItem) {
  const defaults = applyItemDefaults(draft)
  return {
    price:
      draft.pricePerUnit != null
        ? formatGold(draft.pricePerUnit)
        : defaults.price,
    quantity:
      draft.quantity != null ? formatGold(draft.quantity) : defaults.quantity,
  }
}

export function EntryForm({ onAdd, draftItem = null, entries }: Props) {
  const [mode, setMode] = useState<FormMode>('log')
  const [selected, setSelected] = useState<WikiSearchResult | null>(null)
  const [draftImageUrl, setDraftImageUrl] = useState<string | undefined>()
  const [entryTaxExempt, setEntryTaxExempt] = useState(false)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [date, setDate] = useState(todayIso())
  const [soldByDefault, setSoldByDefault] = useState(loadSoldByDefault)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const override = selected ? getItemOverride(selected.title) : undefined
  const exempt = override?.taxExempt === true || entryTaxExempt

  const retrack = useMemo(() => getLastTrackedDayGoods(entries), [entries])

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

  useEffect(() => {
    if (!draftItem) return
    setSelected({ title: draftItem.title, url: draftItem.url })
    setDraftImageUrl(draftItem.imageUrl)
    setEntryTaxExempt(draftItem.taxExempt === true)
    const values = applyDraft(draftItem)
    setPrice(values.price)
    setQuantity(values.quantity)
    setFormError(null)
    const priceInput = document.getElementById('price')
    priceInput?.focus()
  }, [draftItem])

  function handleSelect(item: WikiSearchResult) {
    setSelected(item)
    setDraftImageUrl(undefined)
    setEntryTaxExempt(false)
    const defaults = applyItemDefaults(item)
    setPrice(defaults.price)
    setQuantity(defaults.quantity)
    setFormError(null)
  }

  function handleRetrackPick(entry: IncomeEntry) {
    setSelected({ title: entry.itemName, url: entry.wikiUrl })
    setDraftImageUrl(entry.imageUrl)
    setEntryTaxExempt(entry.taxExempt === true)
    setPrice(formatGold(entry.pricePerUnit))
    setQuantity(formatGold(entry.quantity))
    setFormError(null)
    const priceInput = document.getElementById('price')
    priceInput?.focus()
  }

  const priceNum = parseNumberInput(price)
  const qtyNum = parseNumberInput(quantity)
  const canPreview =
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0

  const gross = canPreview ? calcGross(priceNum, qtyNum) : 0
  const tax = canPreview ? calcTax(gross, exempt) : 0
  const net = canPreview ? calcNet(gross, exempt) : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!selected) {
      setFormError(
        mode === 'retrack'
          ? 'Pick an item from the retrack list.'
          : 'Pick an item from the wiki search results.',
      )
      return
    }
    if (!canPreview) {
      setFormError('Enter a valid price and amount.')
      return
    }

    setSubmitting(true)
    try {
      let imageUrl = draftImageUrl
      if (!imageUrl) {
        try {
          imageUrl = await fetchItemImage(
            selected.title,
            undefined,
            override?.imageFile,
          )
        } catch {
          imageUrl = undefined
        }
      }

      onAdd({
        itemName: selected.title,
        wikiUrl: selected.url,
        imageUrl,
        pricePerUnit: priceNum,
        quantity: qtyNum,
        date,
        taxExempt: exempt || undefined,
        sold: soldByDefault,
      })

      setPrice('')
      setQuantity('1')
      setDraftImageUrl(undefined)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="entry-form panel" onSubmit={handleSubmit} id="log-sale">
      <header className="panel-header form-header-row">
        <div>
          <h2>{mode === 'retrack' ? 'Retrack' : 'Log a sale'}</h2>
          <p>
            {mode === 'retrack'
              ? 'Reuse goods from your last tracked day.'
              : 'Search the wiki, then enter unit price and amount sold.'}
          </p>
        </div>
        <div className="mode-toggle" role="group" aria-label="Entry mode">
          <button
            type="button"
            className={`btn ghost compact${mode === 'log' ? ' active' : ''}`}
            aria-pressed={mode === 'log'}
            onClick={() => setMode('log')}
          >
            Log
          </button>
          <button
            type="button"
            className={`btn ghost compact${mode === 'retrack' ? ' active' : ''}`}
            aria-pressed={mode === 'retrack'}
            onClick={() => setMode('retrack')}
            disabled={!retrack}
          >
            Retrack
          </button>
        </div>
      </header>

      {mode === 'retrack' && retrack ? (
        <RetrackList
          sourceDate={retrack.date}
          items={retrack.items}
          targetDate={date}
          allEntries={entries}
          onPick={handleRetrackPick}
        />
      ) : (
        <ItemSearch
          selectedTitle={selected?.title}
          onSelect={handleSelect}
        />
      )}

      {selected && mode === 'retrack' && (
        <p className="retrack-selected">
          Selected: <strong>{selected.title}</strong>
        </p>
      )}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="price">Price per unit</label>
          <input
            id="price"
            inputMode="decimal"
            type="text"
            autoComplete="off"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="quantity">Amount</label>
          <input
            id="quantity"
            inputMode="numeric"
            type="text"
            autoComplete="off"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {canPreview && (
        <div className="tax-preview" aria-live="polite">
          <div>
            <span>Gross</span>
            <strong>{formatGold(gross)}</strong>
          </div>
          <div>
            <span>{exempt ? 'Market tax (exempt)' : 'Market tax (4%)'}</span>
            <strong>
              {exempt ? formatGold(0) : `−${formatGold(tax)}`}
            </strong>
          </div>
          <div className="net">
            <span>Net profit</span>
            <strong>{formatGold(net)}</strong>
          </div>
        </div>
      )}

      {formError && <p className="field-error">{formError}</p>}

      <label className="sold-default">
        <input
          type="checkbox"
          checked={soldByDefault}
          onChange={(e) => {
            setSoldByDefault(e.target.checked)
            saveSoldByDefault(e.target.checked)
          }}
        />
        <span>
          Sold by default
          <span className="sold-default-hint">
            {soldByDefault
              ? 'Counts toward totals right away.'
              : 'Added as pending — mark “Sold?” in the ledger to count it.'}
          </span>
        </span>
      </label>

      <button className="btn primary" type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add to ledger'}
      </button>
    </form>
  )
}
