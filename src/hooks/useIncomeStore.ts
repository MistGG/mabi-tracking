import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DailyProfit, Expenditure, IncomeEntry } from '../types'
import {
  entryCountsTowardTotals,
  entryGross,
  entryNet,
  todayIso,
} from '../lib/finance'
import {
  loadEntries,
  loadExpenditures,
  saveEntries,
  saveExpenditures,
} from '../lib/storage'

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useIncomeStore() {
  const [entries, setEntries] = useState<IncomeEntry[]>(() => loadEntries())
  const [expenditures, setExpenditures] = useState<Expenditure[]>(() =>
    loadExpenditures(),
  )

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  useEffect(() => {
    saveExpenditures(expenditures)
  }, [expenditures])

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

  const addExpenditure = useCallback(
    (input: Omit<Expenditure, 'id' | 'createdAt'>) => {
      const expenditure: Expenditure = {
        ...input,
        id: createId(),
        createdAt: Date.now(),
      }
      setExpenditures((prev) => [expenditure, ...prev])
      return expenditure
    },
    [],
  )

  const removeExpenditure = useCallback((id: string) => {
    setExpenditures((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setEntries([])
    setExpenditures([])
  }, [])

  const totals = useMemo(() => {
    const counted = entries.filter(entryCountsTowardTotals)
    const gross = counted.reduce((sum, e) => sum + entryGross(e), 0)
    const salesNet = counted.reduce((sum, e) => sum + entryNet(e), 0)
    const tax = gross - salesNet
    const spent = expenditures.reduce((sum, e) => sum + e.amount, 0)
    const net = salesNet - spent
    const today = todayIso()
    const todayEntries = counted.filter((e) => e.date === today)
    const todayGross = todayEntries.reduce((sum, e) => sum + entryGross(e), 0)
    const todaySalesNet = todayEntries.reduce((sum, e) => sum + entryNet(e), 0)
    const todaySpent = expenditures
      .filter((e) => e.date === today)
      .reduce((sum, e) => sum + e.amount, 0)
    return {
      gross,
      tax,
      net,
      spent,
      todayGross,
      todayNet: todaySalesNet - todaySpent,
      todayTax: todayGross - todaySalesNet,
      todaySpent,
      count: entries.length,
      expenditureCount: expenditures.length,
    }
  }, [entries, expenditures])

  const dailyProfits: DailyProfit[] = useMemo(() => {
    const map = new Map<string, DailyProfit>()
    for (const entry of entries) {
      if (!entryCountsTowardTotals(entry)) continue
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
    for (const expense of expenditures) {
      const existing = map.get(expense.date)
      if (existing) {
        existing.net -= expense.amount
      } else {
        map.set(expense.date, {
          date: expense.date,
          gross: 0,
          tax: 0,
          net: -expense.amount,
          entryCount: 0,
        })
      }
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [entries, expenditures])

  return {
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
  }
}
