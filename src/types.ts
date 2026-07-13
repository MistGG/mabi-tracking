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
}

export type WikiSearchResult = {
  title: string
  url: string
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
