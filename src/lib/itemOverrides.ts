export type ItemOverride = {
  /** Wiki File: page name, e.g. Rank_A_Fynni_Pet_Whistle.png */
  imageFile?: string
  taxExempt?: boolean
  defaultPricePerUnit?: number
  defaultQuantity?: number
  /**
   * Value varies per unit, so unit price / net are unknown. Such items show
   * blank money columns and are left out of gross/net/tax totals.
   */
  uniqueValue?: boolean
}

const ITEM_OVERRIDES: Record<string, ItemOverride> = {
  'fynni pet whistle': {
    imageFile: 'Rank_A_Fynni_Pet_Whistle.png',
    taxExempt: true,
    defaultPricePerUnit: 40000,
    defaultQuantity: 30,
    uniqueValue: true,
  },
}

export function getItemOverride(itemName: string): ItemOverride | undefined {
  return ITEM_OVERRIDES[itemName.trim().toLowerCase()]
}

export function isUniqueValueItem(itemName: string): boolean {
  return getItemOverride(itemName)?.uniqueValue === true
}
