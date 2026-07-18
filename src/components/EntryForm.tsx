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
import { GOLD_ITEM } from '../lib/specialItems'
import { loadSoldByDefault, saveSoldByDefault } from '../lib/storage'
import { fetchItemImage } from '../lib/wiki'
import { GoldPickupPanel } from './GoldPickupPanel'
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
  untracked?: boolean
}

type FormMode = 'log' | 'retrack'

type Props = {
  onAdd: (entry: AddPayload) => void
  onAddExpenditure: (input: {
    comment: string
    amount: number
    date: string
  }) => void
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

export function EntryForm({
  onAdd,
  onAddExpenditure,
  draftItem = null,
  entries,
}: Props) {
  const [mode, setMode] = useState<FormMode>('log')
  const [selected, setSelected] = useState<WikiSearchResult | null>(null)
  const [draftImageUrl, setDraftImageUrl] = useState<string | undefined>()
  const [entryTaxExempt, setEntryTaxExempt] = useState(false)
  const [untracked, setUntracked] = useState(false)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [date, setDate] = useState(todayIso())
  const [soldByDefault, setSoldByDefault] = useState(loadSoldByDefault)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const override = selected ? getItemOverride(selected.title) : undefined
  const forceTaxExempt = override?.taxExempt === true
  const forceSold = override?.forceSold === true
  const exempt = forceTaxExempt || entryTaxExempt
  const soldChecked = forceSold || soldByDefault

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
    const itemOverride = getItemOverride(draftItem.title)
    setEntryTaxExempt(
      itemOverride?.taxExempt === true || draftItem.taxExempt === true,
    )
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
    const itemOverride = getItemOverride(item.title)
    setEntryTaxExempt(itemOverride?.taxExempt === true)
    const defaults = applyItemDefaults(item)
    setPrice(defaults.price)
    setQuantity(defaults.quantity)
    setFormError(null)
    setMode('log')
    const priceInput = document.getElementById('price')
    priceInput?.focus()
  }

  function handleGoldPickup(gained: number) {
    setSelected(GOLD_ITEM)
    setDraftImageUrl(undefined)
    setEntryTaxExempt(true)
    setPrice(formatGold(gained))
    setQuantity('1')
    setFormError(null)
    setMode('log')
    const priceInput = document.getElementById('price')
    priceInput?.focus()
  }

  function handleGoldSpend(spent: number) {
    onAddExpenditure({
      comment: 'Gold',
      amount: Math.round(spent),
      date: todayIso(),
    })
  }

  function handleRetrackPick(entry: IncomeEntry) {
    setSelected({ title: entry.itemName, url: entry.wikiUrl })
    setDraftImageUrl(entry.imageUrl)
    const itemOverride = getItemOverride(entry.itemName)
    setEntryTaxExempt(
      itemOverride?.taxExempt === true || entry.taxExempt === true,
    )
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
        sold: forceSold ? true : soldByDefault,
        untracked: untracked || undefined,
      })

      setPrice('')
      setQuantity('1')
      setDraftImageUrl(undefined)
      setUntracked(false)
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
        <>
          <GoldPickupPanel
            onGain={handleGoldPickup}
            onSpend={handleGoldSpend}
          />
          <ItemSearch
            selectedTitle={selected?.title}
            onSelect={handleSelect}
          />
        </>
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
          checked={exempt}
          disabled={forceTaxExempt}
          onChange={(e) => setEntryTaxExempt(e.target.checked)}
        />
        <span>
          Tax exempt
          <span className="sold-default-hint">
            {forceTaxExempt
              ? 'Always on for this item.'
              : entryTaxExempt
                ? 'No 4% market tax on this sale.'
                : 'Market tax (4%) applies after gross.'}
          </span>
        </span>
      </label>

      <label className="sold-default">
        <input
          type="checkbox"
          checked={soldChecked}
          disabled={forceSold}
          onChange={(e) => {
            setSoldByDefault(e.target.checked)
            saveSoldByDefault(e.target.checked)
          }}
        />
        <span>
          Sold by default
          <span className="sold-default-hint">
            {forceSold
              ? 'Always on for this item.'
              : soldByDefault
                ? 'Counts toward totals right away.'
                : 'Added as pending. Mark “Sold?” in the ledger to count it.'}
          </span>
        </span>
      </label>

      <label className="sold-default">
        <input
          type="checkbox"
          checked={untracked}
          onChange={(e) => setUntracked(e.target.checked)}
        />
        <span>
          Untracked
          <span className="sold-default-hint">
            {untracked
              ? 'Adds to all-time net / goal, but not Today or the profit chart.'
              : 'Off by default. Use for gold you had before tracking.'}
          </span>
        </span>
      </label>

      <button className="btn primary" type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add to ledger'}
      </button>
    </form>
  )
}
