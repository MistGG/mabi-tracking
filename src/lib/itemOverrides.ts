export type ItemOverride = {
  /** Wiki File: page name, e.g. Rank_A_Fynni_Pet_Whistle.png */
  imageFile?: string
  taxExempt?: boolean
  /** Always treat as sold when logging this item (checkbox locked on). */
  forceSold?: boolean
  defaultPricePerUnit?: number
  defaultQuantity?: number
  /**
   * Value varies per unit, so unit price / net are unknown. Such items show
   * blank money columns and are left out of gross/net/tax totals.
   */
  uniqueValue?: boolean
  /**
   * Price varies per sale, so change-vs-last-sale deltas are meaningless.
   * The Δ Unit / Δ Net columns render blank for these items.
   */
  hideDeltas?: boolean
}

const ITEM_OVERRIDES: Record<string, ItemOverride> = {
  'fynni pet whistle': {
    imageFile: 'Rank_A_Fynni_Pet_Whistle.png',
    taxExempt: true,
    forceSold: true,
    defaultPricePerUnit: 40000,
    defaultQuantity: 30,
    hideDeltas: true,
  },
  gold: {
    taxExempt: true,
    forceSold: true,
    defaultQuantity: 1,
    hideDeltas: true,
  },
}

export function getItemOverride(itemName: string): ItemOverride | undefined {
  return ITEM_OVERRIDES[itemName.trim().toLowerCase()]
}

export function isUniqueValueItem(itemName: string): boolean {
  return getItemOverride(itemName)?.uniqueValue === true
}

export function shouldHideDeltas(itemName: string): boolean {
  return getItemOverride(itemName)?.hideDeltas === true
}
