import { useEffect, useState } from 'react'
import { BuildsPage } from './components/BuildsPage'
import { ContentPage } from './components/ContentPage'
import { EntryForm } from './components/EntryForm'
import { EntryList } from './components/EntryList'
import { ExpenditurePanel } from './components/ExpenditurePanel'
import { GoalPanel } from './components/GoalPanel'
import { HintsPanel } from './components/HintsPanel'
import { ProfitChart } from './components/ProfitChart'
import { SummaryBar } from './components/SummaryBar'
import { useIncomeStore } from './hooks/useIncomeStore'
import { getItemOverride } from './lib/itemOverrides'
import {
  applyTheme,
  readStoredTheme,
  toggleTheme,
  type ThemeId,
} from './lib/theme'
import type { DraftItem, WikiSearchResult } from './types'
import './App.css'

type PageId = 'tracker' | 'builds' | 'content'

function pageFromHash(): PageId {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const path = hash.split('?')[0]
  if (path === 'builds') return 'builds'
  if (path === 'content') return 'content'
  return 'tracker'
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
      <path
        d="M13.2 9.1A5.8 5.8 0 0 1 6.9 2.8 5.9 5.9 0 1 0 13.2 9.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function App() {
  const {
    entries,
    expenditures,
    addEntry,
    removeEntry,
    updateEntry,
    addExpenditure,
    removeExpenditure,
    clearAll,
    totals,
    dailyProfits,
  } = useIncomeStore()
  const [draftItem, setDraftItem] = useState<DraftItem | null>(null)
  const [page, setPage] = useState<PageId>(() => pageFromHash())
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function goTo(next: PageId) {
    window.location.hash =
      next === 'builds' ? '#/builds' : next === 'content' ? '#/content' : '#/'
    setPage(next)
  }

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
          <div className="hero-top">
            <p className="brand">Mabi Tracker</p>
            <nav className="site-nav" aria-label="Primary">
              <button
                type="button"
                className={`btn ghost compact${page === 'tracker' ? ' active' : ''}`}
                aria-current={page === 'tracker' ? 'page' : undefined}
                onClick={() => goTo('tracker')}
              >
                Tracker
              </button>
              <button
                type="button"
                className={`btn ghost compact${page === 'builds' ? ' active' : ''}`}
                aria-current={page === 'builds' ? 'page' : undefined}
                onClick={() => goTo('builds')}
              >
                Builds
              </button>
              <button
                type="button"
                className={`btn ghost compact${page === 'content' ? ' active' : ''}`}
                aria-current={page === 'content' ? 'page' : undefined}
                onClick={() => goTo('content')}
              >
                Content
              </button>
              <button
                type="button"
                className="btn ghost compact theme-toggle"
                aria-label={
                  theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
                }
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                onClick={() => setTheme((prev) => toggleTheme(prev))}
              >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
            </nav>
          </div>
        </header>

        {page === 'builds' ? (
          <BuildsPage />
        ) : page === 'content' ? (
          <ContentPage />
        ) : (
          <>
            <SummaryBar
              todayNet={totals.todayNet}
              todayGross={totals.todayGross}
              todayTax={totals.todayTax}
              todaySpent={totals.todaySpent}
              totalNet={totals.net}
              totalGross={totals.gross}
              totalTax={totals.tax}
              totalSpent={totals.spent}
              count={totals.count}
              expenditureCount={totals.expenditureCount}
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
                  onAddExpenditure={addExpenditure}
                  draftItem={draftItem}
                  entries={entries}
                />
                <ProfitChart data={dailyProfits} />
              </div>
            </div>

            <ExpenditurePanel
              expenditures={expenditures}
              onAdd={addExpenditure}
              onRemove={removeExpenditure}
            />

            <EntryList
              entries={entries}
              onRemove={removeEntry}
              onSelectItem={(entry) => {
                setDraftItem(draftFromEntry(entry))
                focusForm()
              }}
              onToggleSold={(id, sold) => updateEntry(id, { sold })}
              onToggleUntracked={(id, untracked) =>
                updateEntry(id, { untracked })
              }
              onRelist={(entry) => {
                setDraftItem(draftFromEntry(entry))
                removeEntry(entry.id)
                focusForm()
              }}
            />
          </>
        )}

        <footer className="site-footer">
          <p>
            Item names and reforges from{' '}
            <a
              href="https://wiki.mabinogiworld.com/view/Wiki_Home"
              target="_blank"
              rel="noreferrer"
            >
              Mabinogi World Wiki
            </a>
            {page === 'tracker' ? '. Market tax applied at 4% after gross.' : '.'}
          </p>
        </footer>
      </div>
    </>
  )
}
