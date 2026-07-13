import { useState } from 'react'
import { EntryForm } from './components/EntryForm'
import { EntryList } from './components/EntryList'
import { GoalPanel } from './components/GoalPanel'
import { HintsPanel } from './components/HintsPanel'
import { ProfitChart } from './components/ProfitChart'
import { SummaryBar } from './components/SummaryBar'
import { useIncomeStore } from './hooks/useIncomeStore'
import { getItemOverride } from './lib/itemOverrides'
import type { DraftItem, WikiSearchResult } from './types'
import './App.css'

export default function App() {
  const {
    entries,
    addEntry,
    removeEntry,
    updateEntry,
    clearAll,
    totals,
    dailyProfits,
  } = useIncomeStore()
  const [draftItem, setDraftItem] = useState<DraftItem | null>(null)

  function draftFromEntry(entry: (typeof entries)[number]): DraftItem {
    return {
      title: entry.itemName,
      url: entry.wikiUrl,
      imageUrl: entry.imageUrl,
      pricePerUnit: entry.pricePerUnit,
      quantity: entry.quantity,
      taxExempt: entry.taxExempt,
    }
  }

  function draftFromHint(item: WikiSearchResult): DraftItem {
    const override = getItemOverride(item.title)
    return {
      title: item.title,
      url: item.url,
      taxExempt: override?.taxExempt,
      pricePerUnit: override?.defaultPricePerUnit,
      quantity: override?.defaultQuantity,
    }
  }

  function focusForm() {
    document.getElementById('log-sale')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <>
      <div className="atmosphere" aria-hidden>
        <img
          className="atmosphere-art"
          src={`/mabi-bg.webp?v=2`}
          alt=""
          decoding="async"
          fetchPriority="low"
        />
        <div className="atmosphere-veil" />
      </div>
      <div className="app">
        <header className="hero">
          <p className="brand">Mabi Tracker</p>
        </header>

        <SummaryBar
          todayNet={totals.todayNet}
          todayGross={totals.todayGross}
          todayTax={totals.todayTax}
          totalNet={totals.net}
          totalGross={totals.gross}
          totalTax={totals.tax}
          count={totals.count}
          onClear={clearAll}
        />

        <GoalPanel currentNet={totals.net} dailyProfits={dailyProfits} />

        <div className="layout-band">
          <HintsPanel
            onPick={(item) => {
              setDraftItem(draftFromHint(item))
              focusForm()
            }}
          />
          <div className="layout">
            <EntryForm
              onAdd={addEntry}
              draftItem={draftItem}
              entries={entries}
            />
            <ProfitChart data={dailyProfits} />
          </div>
        </div>

        <EntryList
          entries={entries}
          onRemove={removeEntry}
          onSelectItem={(entry) => {
            setDraftItem(draftFromEntry(entry))
            focusForm()
          }}
          onToggleSold={(id, sold) => updateEntry(id, { sold })}
          onRelist={(entry) => {
            setDraftItem(draftFromEntry(entry))
            removeEntry(entry.id)
            focusForm()
          }}
        />

        <footer className="site-footer">
          <p>
            Item names from{' '}
            <a
              href="https://wiki.mabinogiworld.com/view/Wiki_Home"
              target="_blank"
              rel="noreferrer"
            >
              Mabinogi World Wiki
            </a>
            . Market tax applied at 4% after gross.
          </p>
        </footer>
      </div>
    </>
  )
}
