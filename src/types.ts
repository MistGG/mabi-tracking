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
  /**
   * Prior / out-of-band gold. Counts toward money totals, but is excluded from
   * the daily chart and “today” activity metrics.
   */
  untracked?: boolean
}

/** Custom gold spend that reduces net totals. */
export type Expenditure = {
  id: string
  comment: string
  amount: number
  date: string
  createdAt: number
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
export const EXPENDITURES_KEY = 'mabi-expenditures-v1'
export const EXPENDITURES_MINIMIZED_KEY = 'mabi-expenditures-minimized-v1'
export const SOLD_BY_DEFAULT_KEY = 'mabi-sold-by-default-v1'
export const GOAL_AMOUNT_KEY = 'mabi-goal-amount-v1'
export const GOAL_MINIMIZED_KEY = 'mabi-goal-minimized-v1'
export const HINTS_MINIMIZED_KEY = 'mabi-hints-minimized-v1'
export const START_GOLD_KEY = 'mabi-start-gold-v1'
export const GOLD_PICKUP_MINIMIZED_KEY = 'mabi-gold-pickup-minimized-v1'
export const BUILD_STORAGE_KEY = 'mabi-personalized-build-v1'
export const CONTENT_STORAGE_KEY = 'mabi-content-tracker-v1'
export const THEME_STORAGE_KEY = 'mabi-theme-v1'
