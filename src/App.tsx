import { useState } from 'react'
import { EntryForm } from './components/EntryForm'
import { EntryList } from './components/EntryList'
import { ProfitChart } from './components/ProfitChart'
import { SummaryBar } from './components/SummaryBar'
import { useIncomeStore } from './hooks/useIncomeStore'
import type { WikiSearchResult } from './types'
import './App.css'

export default function App() {
  const { entries, addEntry, removeEntry, clearAll, totals, dailyProfits } =
    useIncomeStore()
  const [draftItem, setDraftItem] = useState<WikiSearchResult | null>(null)

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
          <h1>Income ledger for Erinn</h1>
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

        <div className="layout">
          <EntryForm onAdd={addEntry} draftItem={draftItem} />
          <ProfitChart data={dailyProfits} />
        </div>

        <EntryList
          entries={entries}
          onRemove={removeEntry}
          onSelectItem={(entry) => {
            setDraftItem({
              title: entry.itemName,
              url: entry.wikiUrl,
            })
            document.getElementById('log-sale')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
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
