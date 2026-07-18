import echostoneAwakeningsJson from '../data/echostone-awakenings.json'
import reforgesJson from '../data/reforges.json'

export type ReforgeLevelBands = {
  precise: string
  exquisite: string
  dazzling: string
  limitBreak: string
}

export type ReforgeOption = {
  id: string
  onto: string[]
  skill: string | null
  attribute: string
  effect: string
  levels: ReforgeLevelBands
}

export type EchostoneColor = 'Red' | 'Blue' | 'Yellow' | 'Silver' | 'Black'

export type BuildSlotId =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'body'
  | 'boots'
  | 'glove'
  | 'accessory1'
  | 'accessory2'
  | 'wing'
  | 'echostone1'
  | 'echostone2'
  | 'echostone3'

export type BuildSlotDef = {
  id: BuildSlotId
  label: string
  /** Wiki "Reforges Onto" categories that apply to this slot. */
  ontoTypes: string[]
  /** How many reforge / awakening lines this slot supports. */
  reforgeCount: 0 | 1 | 3
  /** Whether prefix/suffix enchants apply. */
  canEnchant: boolean
  /** Whether inheritable tracking applies (main gear only). */
  canInherit: boolean
  /** Special slot behavior. */
  kind?: 'gear' | 'wing' | 'echostone'
}

export const ECHOSTONE_COLORS: EchostoneColor[] = [
  'Red',
  'Blue',
  'Yellow',
  'Silver',
  'Black',
]

/** Fixed colored echostone picks for build slots (not full item search). */
export const ECHOSTONE_ITEMS: Array<{
  title: string
  url: string
  imageUrl: string
  color: EchostoneColor
}> = [
  {
    color: 'Red',
    title: 'Red Echostone',
    url: 'https://na.mabibase.com/item/53934',
    imageUrl: 'https://api.na.mabibase.com/assets/item/icon/53934',
  },
  {
    color: 'Blue',
    title: 'Blue Echostone',
    url: 'https://na.mabibase.com/item/53935',
    imageUrl: 'https://api.na.mabibase.com/assets/item/icon/53935',
  },
  {
    color: 'Yellow',
    title: 'Yellow Echostone',
    url: 'https://na.mabibase.com/item/53936',
    imageUrl: 'https://api.na.mabibase.com/assets/item/icon/53936',
  },
  {
    color: 'Silver',
    title: 'Silver Echostone',
    url: 'https://na.mabibase.com/item/53937',
    imageUrl: 'https://api.na.mabibase.com/assets/item/icon/53937',
  },
  {
    color: 'Black',
    title: 'Black Echostone',
    url: 'https://na.mabibase.com/item/53938',
    imageUrl: 'https://api.na.mabibase.com/assets/item/icon/53938',
  },
]

export function searchEchostoneItems(
  query: string,
  _signal?: AbortSignal,
): Promise<typeof ECHOSTONE_ITEMS> {
  const q = query.trim().toLowerCase()
  const rows = !q
    ? ECHOSTONE_ITEMS
    : ECHOSTONE_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.color.toLowerCase().includes(q),
      )
  return Promise.resolve(rows)
}

export const BUILD_SLOTS: BuildSlotDef[] = [
  {
    id: 'weapon',
    label: 'Weapon',
    ontoTypes: [
      'One-handed Melee Weapons',
      'Two-handed Melee Weapons',
      'Chain Blades',
      'Control Bars',
      'Knuckles',
      'Lances',
      'Bows and Crossbows',
      'Dual Guns',
      'Shurikens',
      'Atlatls',
      'Cylinders and Tower Cylinders',
      'Wands and Staves',
      'Spell Books',
      'Scythes',
      'Orbs',
    ],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: true,
  },
  {
    id: 'offhand',
    label: 'Offhand',
    ontoTypes: ['Shields'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: true,
  },
  {
    id: 'helmet',
    label: 'Helmet',
    ontoTypes: ['Headgear'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: true,
  },
  {
    id: 'body',
    label: 'Body',
    ontoTypes: ['Bodywear'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: true,
  },
  {
    id: 'glove',
    label: 'Glove',
    ontoTypes: ['Handgear', 'Silk Weaving Gloves'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: true,
  },
  {
    id: 'boots',
    label: 'Boots',
    ontoTypes: ['Footwear'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: true,
  },
  {
    id: 'accessory1',
    label: 'Accessory 1',
    ontoTypes: ['Accessories'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: false,
  },
  {
    id: 'accessory2',
    label: 'Accessory 2',
    ontoTypes: ['Accessories'],
    reforgeCount: 3,
    canEnchant: true,
    canInherit: false,
  },
  {
    id: 'wing',
    label: 'Wing',
    ontoTypes: [],
    reforgeCount: 0,
    canEnchant: true,
    canInherit: false,
    kind: 'wing',
  },
  {
    id: 'echostone1',
    label: 'Echostone 1',
    ontoTypes: [],
    reforgeCount: 1,
    canEnchant: false,
    canInherit: false,
    kind: 'echostone',
  },
  {
    id: 'echostone2',
    label: 'Echostone 2',
    ontoTypes: [],
    reforgeCount: 1,
    canEnchant: false,
    canInherit: false,
    kind: 'echostone',
  },
  {
    id: 'echostone3',
    label: 'Echostone 3',
    ontoTypes: [],
    reforgeCount: 1,
    canEnchant: false,
    canInherit: false,
    kind: 'echostone',
  },
]

export const ALL_REFORGES = reforgesJson as ReforgeOption[]

export const ALL_ECHOSTONE_AWAKENINGS =
  echostoneAwakeningsJson as ReforgeOption[]

export function getSlotDef(slotId: BuildSlotId): BuildSlotDef {
  const slot = BUILD_SLOTS.find((s) => s.id === slotId)
  if (!slot) throw new Error(`Unknown build slot: ${slotId}`)
  return slot
}

export function detectEchostoneColor(
  title: string | null | undefined,
): EchostoneColor | null {
  if (!title) return null
  for (const color of ECHOSTONE_COLORS) {
    if (new RegExp(`\\b${color}\\s+Echostone\\b`, 'i').test(title)) {
      return color
    }
  }
  return null
}

export function reforgesForSlot(
  slotId: BuildSlotId,
  itemTitle?: string | null,
): ReforgeOption[] {
  const slot = getSlotDef(slotId)
  if (slot.reforgeCount === 0) return []

  if (slot.kind === 'echostone') {
    const color = detectEchostoneColor(itemTitle)
    if (!color) return []
    return ALL_ECHOSTONE_AWAKENINGS.filter((r) =>
      r.onto.includes(`${color} Echostone`),
    )
  }

  const allowed = new Set(slot.ontoTypes)
  return ALL_REFORGES.filter((r) => r.onto.some((t) => allowed.has(t)))
}

export function formatReforgeLabel(reforge: ReforgeOption): string {
  const skill = reforge.skill ? `${reforge.skill} · ` : ''
  return `${skill}${reforge.attribute} (${reforge.effect})`
}

/** Prefer full labels; compact kept for very tight contexts. */
export function formatReforgeCompact(reforge: ReforgeOption): string {
  return formatReforgeLabel(reforge)
}

export function reforgeSearchText(reforge: ReforgeOption): string {
  return [
    reforge.skill ?? '',
    reforge.attribute,
    reforge.effect,
    ...reforge.onto,
  ]
    .join(' ')
    .toLowerCase()
}

const CUSTOM_REFORGE_PREFIX = 'custom:'

export function isCustomReforgeId(id: string): boolean {
  return id.startsWith(CUSTOM_REFORGE_PREFIX)
}

export function customReforgeLabel(id: string): string {
  return isCustomReforgeId(id) ? id.slice(CUSTOM_REFORGE_PREFIX.length) : id
}

export function makeCustomReforgeId(text: string): string {
  return `${CUSTOM_REFORGE_PREFIX}${text.trim()}`
}

export function resolveReforgeLabel(
  id: string,
  known?: Map<string, string> | ReadonlyMap<string, string>,
): string {
  return known?.get(id) ?? customReforgeLabel(id)
}
