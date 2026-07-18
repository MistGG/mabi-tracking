import { BUILD_STORAGE_KEY } from '../types'
import type { WikiSearchResult } from '../types'
import { BUILD_SLOTS, type BuildSlotId } from './reforges'

export type BuildItem = WikiSearchResult & {
  imageUrl?: string
}

export type ReforgePriority = 1 | 2 | 3

export type ReforgeLineFlags = {
  complete: boolean
  inheritable: boolean
  /** Priority within the slot (1 red, 2 yellow, 3 blue). Same value may repeat. */
  priority: ReforgePriority | null
}

/** Prefix / suffix enchant on a gear piece. */
export type EnchantLine = {
  title: string
  url: string
  complete: boolean
  inheritable: boolean
}

export type BuildSlotState = {
  item: BuildItem | null
  reforgeIds: [string | null, string | null, string | null]
  /** Gear piece is finished / done. */
  complete: boolean
  /** Per-reforge complete + inheritable flags. */
  reforgeFlags: [ReforgeLineFlags, ReforgeLineFlags, ReforgeLineFlags]
  /** Prefix then suffix. */
  enchants: [EnchantLine | null, EnchantLine | null]
}

export type PersonalizedBuild = {
  name: string
  slots: Record<BuildSlotId, BuildSlotState>
}

/** Compact payload for share URLs. */
type ShareSlot = {
  t?: string
  u?: string
  r?: Array<string | null>
  /** Gear complete */
  c?: 0 | 1
  /** Reforge complete bits, e.g. "101" */
  rc?: string
  /** Reforge inheritable bits, e.g. "010" */
  ry?: string
  /** Reforge priorities, e.g. "120" (0 = none) */
  rp?: string
  /** Enchants: [{t,u,c?,y?}, ...] prefix then suffix */
  e?: Array<{
    t?: string
    u?: string
    c?: 0 | 1
    y?: 0 | 1
  } | null>
  /** Legacy slot-level inheritable (ignored on read). */
  y?: 0 | 1
}

type SharePayload = {
  n?: string
  s?: Partial<Record<BuildSlotId, ShareSlot>>
}

function emptyReforgeFlags(): ReforgeLineFlags {
  return { complete: false, inheritable: false, priority: null }
}

export { emptyReforgeFlags }

export function emptySlotState(): BuildSlotState {
  return {
    item: null,
    reforgeIds: [null, null, null],
    complete: false,
    reforgeFlags: [
      emptyReforgeFlags(),
      emptyReforgeFlags(),
      emptyReforgeFlags(),
    ],
    enchants: [null, null],
  }
}

export function emptyBuild(name = 'My build'): PersonalizedBuild {
  return {
    name,
    slots: {
      weapon: emptySlotState(),
      offhand: emptySlotState(),
      helmet: emptySlotState(),
      body: emptySlotState(),
      glove: emptySlotState(),
      boots: emptySlotState(),
      accessory1: emptySlotState(),
      accessory2: emptySlotState(),
      wing: emptySlotState(),
      echostone1: emptySlotState(),
      echostone2: emptySlotState(),
      echostone3: emptySlotState(),
    },
  }
}

function normalizePriority(value: unknown): ReforgePriority | null {
  if (value === 1 || value === 2 || value === 3) return value
  if (value === '1' || value === '2' || value === '3') {
    return Number(value) as ReforgePriority
  }
  return null
}

function normalizeReforgeFlags(value: unknown): [
  ReforgeLineFlags,
  ReforgeLineFlags,
  ReforgeLineFlags,
] {
  const fallback: [ReforgeLineFlags, ReforgeLineFlags, ReforgeLineFlags] = [
    emptyReforgeFlags(),
    emptyReforgeFlags(),
    emptyReforgeFlags(),
  ]
  if (!Array.isArray(value) || value.length !== 3) return fallback
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') return emptyReforgeFlags()
    const raw = entry as Record<string, unknown>
    return {
      complete: raw.complete === true,
      inheritable: raw.inheritable === true,
      priority: normalizePriority(raw.priority),
    }
  }) as [ReforgeLineFlags, ReforgeLineFlags, ReforgeLineFlags]
}

function normalizeEnchant(value: unknown): EnchantLine | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.title !== 'string' || typeof raw.url !== 'string') return null
  if (!raw.title.trim()) return null
  return {
    title: raw.title,
    url: raw.url,
    complete: raw.complete === true,
    inheritable: raw.inheritable === true,
  }
}

function normalizeEnchants(
  value: unknown,
): [EnchantLine | null, EnchantLine | null] {
  if (!Array.isArray(value)) return [null, null]
  return [normalizeEnchant(value[0]), normalizeEnchant(value[1])]
}

function normalizeSlot(value: unknown): BuildSlotState | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Record<string, unknown>
  if (!Array.isArray(s.reforgeIds) || s.reforgeIds.length !== 3) return null
  if (!s.reforgeIds.every((id) => id === null || typeof id === 'string')) {
    return null
  }

  let item: BuildItem | null = null
  if (s.item !== null && s.item !== undefined) {
    if (!s.item || typeof s.item !== 'object') return null
    const raw = s.item as Record<string, unknown>
    if (typeof raw.title !== 'string' || typeof raw.url !== 'string') return null
    item = {
      title: raw.title,
      url: raw.url,
      ...(typeof raw.imageUrl === 'string' ? { imageUrl: raw.imageUrl } : {}),
    }
  }

  return {
    item,
    reforgeIds: s.reforgeIds as [string | null, string | null, string | null],
    complete: s.complete === true,
    reforgeFlags: normalizeReforgeFlags(s.reforgeFlags),
    enchants: normalizeEnchants(s.enchants),
  }
}

function normalizeBuild(parsed: Partial<PersonalizedBuild>): PersonalizedBuild {
  const base = emptyBuild(
    typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name.trim()
      : 'My build',
  )
  if (!parsed.slots || typeof parsed.slots !== 'object') return base
  for (const key of Object.keys(base.slots) as BuildSlotId[]) {
    const slot = normalizeSlot((parsed.slots as Record<string, unknown>)[key])
    if (!slot) continue
    const def = BUILD_SLOTS.find((s) => s.id === key)
    if (def && !def.canInherit) {
      slot.reforgeFlags = slot.reforgeFlags.map((flags) => ({
        ...flags,
        inheritable: false,
      })) as typeof slot.reforgeFlags
      slot.enchants = slot.enchants.map((enchant) =>
        enchant ? { ...enchant, inheritable: false } : null,
      ) as typeof slot.enchants
    }
    base.slots[key] = slot
  }
  return base
}

export function loadBuild(): PersonalizedBuild {
  try {
    const raw = localStorage.getItem(BUILD_STORAGE_KEY)
    if (!raw) return emptyBuild()
    return normalizeBuild(JSON.parse(raw) as Partial<PersonalizedBuild>)
  } catch {
    return emptyBuild()
  }
}

export function saveBuild(build: PersonalizedBuild): void {
  try {
    localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify(build))
  } catch {
    // ignore write failures
  }
}

export function buildHasContent(build: PersonalizedBuild): boolean {
  return BUILD_SLOTS.some((slot) => {
    const state = build.slots[slot.id]
    return (
      Boolean(state.item) ||
      state.reforgeIds.some(Boolean) ||
      state.enchants.some(Boolean) ||
      state.complete ||
      state.reforgeFlags.some(
        (f) => f.complete || f.inheritable || f.priority !== null,
      )
    )
  })
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function flagsToBits(flags: ReforgeLineFlags[], key: 'complete' | 'inheritable') {
  const bits = flags.map((f) => (f[key] ? '1' : '0')).join('')
  return bits === '000' ? undefined : bits
}

function bitsToFlags(
  completeBits: string | undefined,
  inheritBits: string | undefined,
  priorityBits: string | undefined,
): [ReforgeLineFlags, ReforgeLineFlags, ReforgeLineFlags] {
  const c = (completeBits ?? '000').padEnd(3, '0')
  const y = (inheritBits ?? '000').padEnd(3, '0')
  const p = (priorityBits ?? '000').padEnd(3, '0')
  return [0, 1, 2].map((i) => ({
    complete: c[i] === '1',
    inheritable: y[i] === '1',
    priority: normalizePriority(p[i]),
  })) as [ReforgeLineFlags, ReforgeLineFlags, ReforgeLineFlags]
}

function prioritiesToBits(flags: ReforgeLineFlags[]): string | undefined {
  const bits = flags.map((f) => (f.priority ? String(f.priority) : '0')).join('')
  return bits === '000' ? undefined : bits
}

function buildToSharePayload(build: PersonalizedBuild): SharePayload {
  const s: NonNullable<SharePayload['s']> = {}
  for (const slot of BUILD_SLOTS) {
    const state = build.slots[slot.id]
    const hasItem = Boolean(state.item)
    const hasReforge = state.reforgeIds.some(Boolean)
    const hasEnchant = state.enchants.some(Boolean)
    const hasFlags =
      state.complete ||
      state.reforgeFlags.some(
        (f) => f.complete || f.inheritable || f.priority !== null,
      )
    if (!hasItem && !hasReforge && !hasEnchant && !hasFlags) continue
    const entry: ShareSlot = {
      r: [...state.reforgeIds],
    }
    if (state.item) {
      entry.t = state.item.title
      entry.u = state.item.url
    }
    if (state.complete) entry.c = 1
    const rc = flagsToBits(state.reforgeFlags, 'complete')
    const ry = flagsToBits(state.reforgeFlags, 'inheritable')
    const rp = prioritiesToBits(state.reforgeFlags)
    if (rc) entry.rc = rc
    if (ry) entry.ry = ry
    if (rp) entry.rp = rp
    if (hasEnchant) {
      entry.e = state.enchants.map((enchant) =>
        enchant
          ? {
              t: enchant.title,
              u: enchant.url,
              ...(enchant.complete ? { c: 1 as const } : {}),
              ...(enchant.inheritable ? { y: 1 as const } : {}),
            }
          : null,
      )
    }
    s[slot.id] = entry
  }
  return {
    n: build.name.trim() || 'My build',
    s,
  }
}

function sharePayloadToBuild(payload: SharePayload): PersonalizedBuild {
  const base = emptyBuild(
    typeof payload.n === 'string' && payload.n.trim()
      ? payload.n.trim()
      : 'My build',
  )
  if (!payload.s) return base
  for (const slot of BUILD_SLOTS) {
    const raw = payload.s[slot.id]
    if (!raw || typeof raw !== 'object') continue
    const ids = Array.isArray(raw.r)
      ? ([
          raw.r[0] ?? null,
          raw.r[1] ?? null,
          raw.r[2] ?? null,
        ] as [string | null, string | null, string | null])
      : ([null, null, null] as [string | null, string | null, string | null])
    const item =
      typeof raw.t === 'string' && typeof raw.u === 'string'
        ? { title: raw.t, url: raw.u }
        : null
    const enchants: [EnchantLine | null, EnchantLine | null] = [null, null]
    if (Array.isArray(raw.e)) {
      for (let i = 0; i < 2; i++) {
        const entry = raw.e[i]
        if (
          entry &&
          typeof entry === 'object' &&
          typeof entry.t === 'string' &&
          typeof entry.u === 'string'
        ) {
          enchants[i] = {
            title: entry.t,
            url: entry.u,
            complete: entry.c === 1,
            inheritable: entry.y === 1,
          }
        }
      }
    }
    base.slots[slot.id] = {
      item,
      reforgeIds: ids,
      complete: raw.c === 1,
      reforgeFlags: bitsToFlags(
        typeof raw.rc === 'string' ? raw.rc : undefined,
        typeof raw.ry === 'string' ? raw.ry : undefined,
        typeof raw.rp === 'string' ? raw.rp : undefined,
      ),
      enchants,
    }
  }
  return base
}

export function encodeBuildShare(build: PersonalizedBuild): string {
  const json = JSON.stringify(buildToSharePayload(build))
  return toBase64Url(new TextEncoder().encode(json))
}

export function decodeBuildShare(encoded: string): PersonalizedBuild | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded))
    const payload = JSON.parse(json) as SharePayload
    if (!payload || typeof payload !== 'object') return null
    return sharePayloadToBuild(payload)
  } catch {
    return null
  }
}

/** Read `b` from `#/builds?b=...` or `#/builds&b=...`. */
export function readSharedBuildFromHash(): PersonalizedBuild | null {
  const hash = window.location.hash.replace(/^#/, '')
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return null
  const params = new URLSearchParams(hash.slice(queryIndex + 1))
  const encoded = params.get('b')
  if (!encoded) return null
  return decodeBuildShare(encoded)
}

export function buildShareUrl(build: PersonalizedBuild): string {
  const encoded = encodeBuildShare(build)
  const url = new URL(window.location.href)
  url.hash = `#/builds?b=${encoded}`
  return url.toString()
}
