import { useEffect, useId, useRef, useState } from 'react'
import type { WikiSearchResult } from '../types'
import { searchWikiItems } from '../lib/wiki'

type Props = {
  onSelect: (item: WikiSearchResult) => void
  selectedTitle?: string
}

export function ItemSearch({ onSelect, selectedTitle }: Props) {
  const listId = useId()
  const [query, setQuery] = useState(selectedTitle ?? '')
  const [results, setResults] = useState<WikiSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedTitle) setQuery(selectedTitle)
  }, [selectedTitle])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    // Already confirmed selection from search or ledger refill
    if (selectedTitle && q === selectedTitle) {
      setResults([])
      setOpen(false)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await searchWikiItems(q, controller.signal)
        if (!controller.signal.aborted) {
          setResults(items)
          setOpen(true)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Could not reach the wiki. Try again.')
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, selectedTitle])

  return (
    <div className="field item-search" ref={wrapRef}>
      <label htmlFor="item-search">Item</label>
      <div className="search-box">
        <input
          id="item-search"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Search Mabinogi World Wiki…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length) setOpen(true)
          }}
        />
        {loading && <span className="search-status">Searching…</span>}
        {open && results.length > 0 && (
          <ul id={listId} className="search-results" role="listbox">
            {results.map((item) => (
              <li key={item.url} role="option">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    setQuery(item.title)
                    setOpen(false)
                  }}
                >
                  <span>{item.title}</span>
                  <span className="result-hint">wiki</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      {open &&
        !loading &&
        query.trim().length >= 2 &&
        results.length === 0 &&
        !error && (
          <p className="search-empty">No wiki pages matched that name.</p>
        )}
    </div>
  )
}
