import { useEffect, useId, useRef, useState } from 'react'
import type { WikiSearchResult } from '../types'
import {
  announceDropdownOpen,
  onDropdownOpen,
} from '../lib/exclusiveDropdown'
import { searchWikiItems } from '../lib/wiki'

export type ItemSearchHit = WikiSearchResult & {
  imageUrl?: string
}

type Props = {
  onSelect: (item: ItemSearchHit) => void
  selectedTitle?: string
  id?: string
  label?: string
  placeholder?: string
  /** Hide visible label (e.g. table headers already name the column). */
  hideLabel?: boolean
  /** Defaults to wiki search (tracker). Builds page passes Mabibase. */
  searchFn?: (
    query: string,
    signal?: AbortSignal,
  ) => Promise<ItemSearchHit[]>
  sourceHint?: string
  errorMessage?: string
  emptyMessage?: string
  /** Minimum characters before searching. Use 0 to list options on focus. */
  minQueryLength?: number
  /** Allow committing typed text when nothing matches. */
  allowCustom?: boolean
  /** Fires as the user types (for forms that commit on Add). */
  onQueryChange?: (query: string) => void
}

function wikiUrlForTitle(title: string): string {
  return `https://wiki.mabinogiworld.com/view/${encodeURIComponent(
    title.replace(/ /g, '_'),
  )}`
}

export function ItemSearch({
  onSelect,
  selectedTitle,
  id,
  label = 'Item',
  placeholder = 'Search Mabinogi World Wiki…',
  hideLabel = false,
  searchFn = searchWikiItems,
  sourceHint = 'wiki',
  errorMessage = 'Could not reach the wiki. Try again.',
  emptyMessage = 'No wiki pages matched that name.',
  minQueryLength = 2,
  allowCustom = false,
  onQueryChange,
}: Props) {
  const ownerId = useId()
  const generatedId = useId()
  const inputId = id ?? `item-search-${generatedId}`
  const listId = useId()
  const [query, setQuery] = useState(selectedTitle ?? '')
  const [results, setResults] = useState<ItemSearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  function openMenu() {
    announceDropdownOpen(ownerId)
    setOpen(true)
  }

  function commitCustom(raw: string) {
    const title = raw.trim()
    if (!title) return
    onSelect({ title, url: wikiUrlForTitle(title) })
    onQueryChange?.(title)
    setQuery(title)
    setOpen(false)
    setResults([])
  }

  useEffect(() => {
    if (selectedTitle) setQuery(selectedTitle)
    else setQuery('')
  }, [selectedTitle])

  useEffect(() => {
    return onDropdownOpen((openedId) => {
      if (openedId !== ownerId) setOpen(false)
    })
  }, [ownerId])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < minQueryLength) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

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
        const items = await searchFn(q, controller.signal)
        if (!controller.signal.aborted) {
          setResults(items)
          announceDropdownOpen(ownerId)
          setOpen(true)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(errorMessage)
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, minQueryLength === 0 ? 0 : 280)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, selectedTitle, ownerId, searchFn, errorMessage, minQueryLength])

  const canUseCustom =
    allowCustom &&
    !loading &&
    query.trim().length >= Math.max(minQueryLength, 1) &&
    results.length === 0 &&
    query.trim() !== (selectedTitle ?? '') &&
    !error

  return (
    <div
      className={`field item-search${hideLabel ? ' field-compact' : ''}`}
      ref={wrapRef}
    >
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </label>
      <div className="search-box">
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={query}
          title={query || undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            onQueryChange?.(e.target.value)
            openMenu()
          }}
          onFocus={() => {
            if (minQueryLength === 0) {
              openMenu()
              void searchFn(
                selectedTitle && query.trim() === selectedTitle
                  ? ''
                  : query,
              ).then((items) => {
                setResults(items)
              })
              return
            }
            if (results.length) openMenu()
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (canUseCustom) commitCustom(query)
            else if (results[0]) {
              onSelect(results[0])
              setQuery(results[0].title)
              setOpen(false)
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!wrapRef.current?.contains(document.activeElement)) {
                if (canUseCustom) commitCustom(query)
              }
            }, 0)
          }}
        />
        {loading && (
          <span className="search-status" aria-hidden>
            <span className="search-spinner" />
          </span>
        )}
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
                  <span className="result-main">
                    {item.imageUrl ? (
                      <img
                        className="result-icon"
                        src={item.imageUrl}
                        alt=""
                        width={20}
                        height={20}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span className="result-title">{item.title}</span>
                  </span>
                  <span className="result-hint">{sourceHint}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      {open && canUseCustom && (
        <button
          type="button"
          className="search-custom"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => commitCustom(query)}
        >
          Use “{query.trim()}”
        </button>
      )}
      {open &&
        !loading &&
        !allowCustom &&
        query.trim().length >= minQueryLength &&
        results.length === 0 &&
        !error && <p className="search-empty">{emptyMessage}</p>}
    </div>
  )
}
