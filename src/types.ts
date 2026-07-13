export type IncomeEntry = {
  id: string
  itemName: string
  wikiUrl: string
  imageUrl?: string
  pricePerUnit: number
  quantity: number
  date: string
  createdAt: number
  /** When true, market tax is not applied (e.g. cash shop / gift items). */
  taxExempt?: boolean
  /**
   * Whether the sale has completed. Only sold entries count toward totals.
   * Missing (undefined) is treated as sold for backwards compatibility.
   */
  sold?: boolean
}

export type WikiSearchResult = {
  title: string
  url: string
}

/** Prefill for the sale form (ledger click or retrack). */
export type DraftItem = WikiSearchResult & {
  imageUrl?: string
  pricePerUnit?: number
  quantity?: number
  taxExempt?: boolean
}

export type DailyProfit = {
  date: string
  gross: number
  tax: number
  net: number
  entryCount: number
}

export const MARKET_TAX_RATE = 0.04
export const STORAGE_KEY = 'mabi-income-tracker-v1'
export const SOLD_BY_DEFAULT_KEY = 'mabi-sold-by-default-v1'
export const GOAL_AMOUNT_KEY = 'mabi-goal-amount-v1'
export const GOAL_MINIMIZED_KEY = 'mabi-goal-minimized-v1'
