export type ItemOverride = {
  /** Wiki File: page name, e.g. Rank_A_Fynni_Pet_Whistle.png */
  imageFile?: string
  taxExempt?: boolean
  defaultPricePerUnit?: number
  defaultQuantity?: number
}

const ITEM_OVERRIDES: Record<string, ItemOverride> = {
  'fynni pet whistle': {
    imageFile: 'Rank_A_Fynni_Pet_Whistle.png',
    taxExempt: true,
    defaultPricePerUnit: 40000,
    defaultQuantity: 30,
  },
}

export function getItemOverride(itemName: string): ItemOverride | undefined {
  return ITEM_OVERRIDES[itemName.trim().toLowerCase()]
}
