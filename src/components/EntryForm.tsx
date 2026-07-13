import { useEffect, useState, type FormEvent } from 'react'
import type { WikiSearchResult } from '../types'
import { calcGross, calcNet, calcTax, formatGold, todayIso } from '../lib/finance'
import { fetchItemImage } from '../lib/wiki'
import { ItemSearch } from './ItemSearch'

type AddPayload = {
  itemName: string
  wikiUrl: string
  imageUrl?: string
  pricePerUnit: number
  quantity: number
  date: string
}

type Props = {
  onAdd: (entry: AddPayload) => void
  draftItem?: WikiSearchResult | null
}

export function EntryForm({ onAdd, draftItem = null }: Props) {
  const [selected, setSelected] = useState<WikiSearchResult | null>(null)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [date, setDate] = useState(todayIso())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!draftItem) return
    setSelected(draftItem)
    setFormError(null)
    const priceInput = document.getElementById('price')
    priceInput?.focus()
  }, [draftItem])

  const priceNum = Number(price)
  const qtyNum = Number(quantity)
  const canPreview =
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0

  const gross = canPreview ? calcGross(priceNum, qtyNum) : 0
  const tax = canPreview ? calcTax(gross) : 0
  const net = canPreview ? calcNet(gross) : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!selected) {
      setFormError('Pick an item from the wiki search results.')
      return
    }
    if (!canPreview) {
      setFormError('Enter a valid price and amount.')
      return
    }

    setSubmitting(true)
    try {
      let imageUrl: string | undefined
      try {
        imageUrl = await fetchItemImage(selected.title)
      } catch {
        imageUrl = undefined
      }

      onAdd({
        itemName: selected.title,
        wikiUrl: selected.url,
        imageUrl,
        pricePerUnit: priceNum,
        quantity: qtyNum,
        date,
      })

      setPrice('')
      setQuantity('1')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="entry-form panel" onSubmit={handleSubmit} id="log-sale">
      <header className="panel-header">
        <h2>Log a sale</h2>
        <p>Search the wiki, then enter unit price and amount sold.</p>
      </header>

      <ItemSearch
        selectedTitle={selected?.title}
        onSelect={(item) => setSelected(item)}
      />

      <div className="form-grid">
        <div className="field">
          <label htmlFor="price">Price per unit</label>
          <input
            id="price"
            inputMode="decimal"
            type="number"
            min="0"
            step="1"
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
            type="number"
            min="1"
            step="1"
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
            <span>Market tax (4%)</span>
            <strong>−{formatGold(tax)}</strong>
          </div>
          <div className="net">
            <span>Net profit</span>
            <strong>{formatGold(net)}</strong>
          </div>
        </div>
      )}

      {formError && <p className="field-error">{formError}</p>}

      <button className="btn primary" type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add to ledger'}
      </button>
    </form>
  )
}
