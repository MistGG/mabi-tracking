import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  announceDropdownOpen,
  onDropdownOpen,
} from '../lib/exclusiveDropdown'
import type { ReforgeOption } from '../lib/reforges'
import {
  customReforgeLabel,
  formatReforgeCompact,
  formatReforgeLabel,
  isCustomReforgeId,
  makeCustomReforgeId,
  reforgeSearchText,
} from '../lib/reforges'

type Props = {
  options: ReforgeOption[]
  value: string | null
  onChange: (id: string | null) => void
  label: string
  excludeIds?: Array<string | null>
  hideLabel?: boolean
  disabled?: boolean
  placeholder?: string
}

export function ReforgePicker({
  options,
  value,
  onChange,
  label,
  excludeIds = [],
  hideLabel = false,
  disabled = false,
  placeholder = 'Search reforges…',
}: Props) {
  const ownerId = useId()
  const inputId = useId()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.id === value) ?? null
  const customText =
    value && !selected && isCustomReforgeId(value)
      ? customReforgeLabel(value)
      : null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  function openMenu() {
    if (disabled) return
    announceDropdownOpen(ownerId)
    setOpen(true)
  }

  function commitCustom(raw: string) {
    const text = raw.trim()
    if (!text) {
      onChange(null)
      setQuery('')
      setOpen(false)
      return
    }
    onChange(makeCustomReforgeId(text))
    setQuery(text)
    setOpen(false)
  }

  useEffect(() => {
    if (selected) {
      setQuery(
        hideLabel
          ? formatReforgeCompact(selected)
          : formatReforgeLabel(selected),
      )
      return
    }
    if (customText !== null) {
      setQuery(customText)
      return
    }
    if (!value) setQuery('')
  }, [selected, customText, value, hideLabel])

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
    if (disabled) setOpen(false)
  }, [disabled])

  const excluded = useMemo(
    () => new Set(excludeIds.filter((id): id is string => Boolean(id))),
    [excludeIds],
  )

  const selectedDisplay = selected
    ? hideLabel
      ? formatReforgeCompact(selected)
      : formatReforgeLabel(selected)
    : (customText ?? '')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = options.filter(
      (o) => o.id === value || !excluded.has(o.id),
    )
    if (!q || (selectedDisplay && q === selectedDisplay.toLowerCase())) {
      return available.slice(0, 40)
    }
    return available
      .filter((o) => reforgeSearchText(o).includes(q))
      .slice(0, 40)
  }, [options, query, selectedDisplay, excluded, value])

  const canUseCustom =
    !disabled &&
    query.trim().length > 0 &&
    filtered.length === 0 &&
    query.trim() !== selectedDisplay

  return (
    <div
      className={`field reforge-picker${hideLabel ? ' field-compact' : ''}${
        disabled ? ' is-disabled' : ''
      }`}
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
          aria-disabled={disabled}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          title={
            selected
              ? formatReforgeLabel(selected)
              : customText || query || undefined
          }
          onChange={(e) => {
            setQuery(e.target.value)
            openMenu()
            if (!e.target.value.trim()) onChange(null)
          }}
          onFocus={openMenu}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (canUseCustom) commitCustom(query)
            else if (filtered[0]) {
              const option = filtered[0]
              onChange(option.id)
              setQuery(
                hideLabel
                  ? formatReforgeCompact(option)
                  : formatReforgeLabel(option),
              )
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
        {value && !disabled && (
          <button
            type="button"
            className="reforge-clear"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange(null)
              setQuery('')
              setOpen(false)
            }}
          >
            ×
          </button>
        )}
        {open && !disabled && filtered.length > 0 && (
          <ul id={listId} className="search-results" role="listbox">
            {filtered.map((option) => (
              <li key={option.id} role="option">
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id)
                    setQuery(
                      hideLabel
                        ? formatReforgeCompact(option)
                        : formatReforgeLabel(option),
                    )
                    setOpen(false)
                  }}
                >
                  <span className="reforge-option-main">
                    {option.skill ? (
                      <>
                        <strong>{option.skill}</strong>
                        {' · '}
                        {option.attribute}
                      </>
                    ) : (
                      <strong>{option.attribute}</strong>
                    )}
                  </span>
                  <span className="result-hint">{option.effect}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && !disabled && canUseCustom && (
        <button
          type="button"
          className="search-custom"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => commitCustom(query)}
        >
          Use “{query.trim()}”
        </button>
      )}
    </div>
  )
}
