import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DailyProfit, IncomeEntry } from '../types'
import { entryGross, entryNet, todayIso } from '../lib/finance'
import { loadEntries, saveEntries } from '../lib/storage'

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useIncomeStore() {
  const [entries, setEntries] = useState<IncomeEntry[]>(() => loadEntries())

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const addEntry = useCallback(
    (input: Omit<IncomeEntry, 'id' | 'createdAt'>) => {
      const entry: IncomeEntry = {
        ...input,
        id: createId(),
        createdAt: Date.now(),
      }
      setEntries((prev) => [entry, ...prev])
      return entry
    },
    [],
  )

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const updateEntry = useCallback(
    (id: string, patch: Partial<Omit<IncomeEntry, 'id' | 'createdAt'>>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      )
    },
    [],
  )

  const clearAll = useCallback(() => {
    setEntries([])
  }, [])

  const totals = useMemo(() => {
    const gross = entries.reduce((sum, e) => sum + entryGross(e), 0)
    const net = entries.reduce((sum, e) => sum + entryNet(e), 0)
    const tax = gross - net
    const today = todayIso()
    const todayEntries = entries.filter((e) => e.date === today)
    const todayGross = todayEntries.reduce((sum, e) => sum + entryGross(e), 0)
    const todayNet = todayEntries.reduce((sum, e) => sum + entryNet(e), 0)
    return {
      gross,
      tax,
      net,
      todayGross,
      todayNet,
      todayTax: todayGross - todayNet,
      count: entries.length,
    }
  }, [entries])

  const dailyProfits: DailyProfit[] = useMemo(() => {
    const map = new Map<string, DailyProfit>()
    for (const entry of entries) {
      const existing = map.get(entry.date)
      const gross = entryGross(entry)
      const net = entryNet(entry)
      const tax = gross - net
      if (existing) {
        existing.gross += gross
        existing.tax += tax
        existing.net += net
        existing.entryCount += 1
      } else {
        map.set(entry.date, {
          date: entry.date,
          gross,
          tax,
          net,
          entryCount: 1,
        })
      }
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [entries])

  return {
    entries,
    addEntry,
    removeEntry,
    updateEntry,
    clearAll,
    totals,
    dailyProfits,
  }
}
