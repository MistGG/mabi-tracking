import type { WikiSearchResult } from '../types'

/** Mabibase GraphQL (CORS-blocked from GH Pages — use proxy). */
const MABIBASE_API_DIRECT = 'https://api.na.mabibase.com/graphql?t=1'

/**
 * Dev: Vite proxies /mabibase → api.na.mabibase.com
 * Prod: Cloudflare Worker proxy (see workers/mabibase-proxy)
 */
function localProxyEndpoint(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}mabibase/graphql?t=1`
}

function graphqlEndpoint(): string {
  const override = import.meta.env.VITE_MABIBASE_GRAPHQL as string | undefined
  if (override) return override

  // Vite proxies /mabi-tracking/mabibase → api.na.mabibase.com (dev + preview)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return localProxyEndpoint()
    }
  } else if (import.meta.env.DEV) {
    return localProxyEndpoint()
  }

  return (
    (import.meta.env.VITE_MABIBASE_PROXY as string | undefined) ??
    'https://mabi-tracking-mabibase.qawsar-ahmed.workers.dev/graphql?t=1'
  )
}

export type MabibaseItemResult = WikiSearchResult & {
  id: number
  imageUrl?: string
  description?: string
}

export type MabibaseEnchantResult = {
  id: number
  title: string
  url: string
  scrollName?: string | null
  type?: string
  rank?: string
}

type GraphQlError = { message?: string }

async function mabibaseGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(graphqlEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  })
  if (!res.ok) throw new Error(`Mabibase request failed (${res.status})`)

  const json = (await res.json()) as {
    data?: T
    errors?: GraphQlError[]
  }
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Mabibase GraphQL error')
  }
  if (!json.data) throw new Error('Mabibase returned no data')
  return json.data
}

const ITEM_SEARCH_QUERY = `
query itemSearch($filters: [ItemSearchFilterInput!], $pagination: PaginationInput) {
  items {
    results(filters: $filters, pagination: $pagination) {
      key { id feature }
      data {
        localName
        description
        miscData { iconUrl }
      }
    }
  }
}
`

export async function searchMabibaseItems(
  query: string,
  signal?: AbortSignal,
  limit = 12,
): Promise<MabibaseItemResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const data = await mabibaseGraphql<{
    items: {
      results: Array<{
        key: { id: number; feature: string | null }
        data: {
          localName: string | null
          description: string | null
          miscData: { iconUrl: string | null } | null
        }
      }>
    }
  }>(
    ITEM_SEARCH_QUERY,
    {
      filters: [{ type: 'localName', value: trimmed }],
      pagination: { pageSize: limit, pageIndex: 0 },
    },
    signal,
  )

  return data.items.results
    .map((row) => {
      const title = row.data.localName?.trim()
      if (!title) return null
      const id = row.key.id
      const iconUrl = row.data.miscData?.iconUrl ?? undefined
      return {
        id,
        title,
        url: `https://na.mabibase.com/item/${id}`,
        ...(iconUrl ? { imageUrl: iconUrl } : {}),
        ...(row.data.description
          ? { description: row.data.description }
          : {}),
      } satisfies MabibaseItemResult
    })
    .filter((row): row is MabibaseItemResult => row !== null)
}

const ENCHANT_SEARCH_QUERY = `
query enchantSearch($filters: [EnchantSearchFilterInput!], $pagination: PaginationInput) {
  enchants {
    results(filters: $filters, pagination: $pagination) {
      key { id }
      data {
        appliedName
        scrollName
        type
        rank
      }
    }
  }
}
`

/** Ready for builds enchant UI later — hits https://na.mabibase.com/enchants/search data. */
export async function searchMabibaseEnchants(
  query: string,
  signal?: AbortSignal,
  limit = 12,
  enchantType?: 'Prefix' | 'Suffix',
): Promise<MabibaseEnchantResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const filters: Array<{ type: string; value: string }> = [
    { type: 'localName', value: trimmed },
  ]
  if (enchantType) {
    filters.push({ type: 'type', value: enchantType })
  }

  const data = await mabibaseGraphql<{
    enchants: {
      results: Array<{
        key: { id: number }
        data: {
          appliedName: string | null
          scrollName: string | null
          type: string | null
          rank: string | null
        }
      }>
    }
  }>(
    ENCHANT_SEARCH_QUERY,
    {
      filters,
      pagination: { pageSize: limit, pageIndex: 0 },
    },
    signal,
  )

  const results: MabibaseEnchantResult[] = []
  for (const row of data.enchants.results) {
    const title = row.data.appliedName?.trim()
    if (!title) continue
    const id = row.key.id
    const q = `localName,"${title.replace(/"/g, '')}"`
    results.push({
      id,
      title,
      url: `https://na.mabibase.com/enchants/search?q=${encodeURIComponent(q)}`,
      scrollName: row.data.scrollName,
      ...(row.data.type ? { type: row.data.type } : {}),
      ...(row.data.rank ? { rank: row.data.rank } : {}),
    })
  }
  return results
}

/** Exposed for tests / debugging. */
export const MABIBASE_DIRECT_GRAPHQL = MABIBASE_API_DIRECT
