import type { WikiSearchResult } from '../types'

const WIKI_API = 'https://wiki.mabinogiworld.com/api.php'

export async function searchWikiItems(
  query: string,
  signal?: AbortSignal,
): Promise<WikiSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = new URL(WIKI_API)
  url.searchParams.set('action', 'opensearch')
  url.searchParams.set('search', trimmed)
  url.searchParams.set('limit', '10')
  url.searchParams.set('namespace', '0')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error('Wiki search failed')

  const data = (await res.json()) as [
    string,
    string[],
    string[],
    string[],
  ]

  const titles = data[1] ?? []
  const urls = data[3] ?? []

  return titles.map((title, i) => ({
    title,
    url: urls[i] ?? `https://wiki.mabinogiworld.com/view/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  }))
}

export async function fetchItemImage(
  title: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const parseUrl = new URL(WIKI_API)
  parseUrl.searchParams.set('action', 'parse')
  parseUrl.searchParams.set('page', title)
  parseUrl.searchParams.set('prop', 'images')
  parseUrl.searchParams.set('redirects', '1')
  parseUrl.searchParams.set('format', 'json')
  parseUrl.searchParams.set('origin', '*')

  const parseRes = await fetch(parseUrl.toString(), { signal })
  if (!parseRes.ok) return undefined

  const parseData = (await parseRes.json()) as {
    parse?: { images?: string[] }
  }
  const images = parseData.parse?.images ?? []
  if (images.length === 0) return undefined

  const preferred =
    images.find((name) =>
      name.toLowerCase().includes(title.toLowerCase().replace(/ /g, '_')),
    ) ??
    images.find((name) => /\.(png|jpe?g|gif|webp)$/i.test(name)) ??
    images[0]

  if (!preferred) return undefined

  const infoUrl = new URL(WIKI_API)
  infoUrl.searchParams.set('action', 'query')
  infoUrl.searchParams.set('titles', `File:${preferred}`)
  infoUrl.searchParams.set('prop', 'imageinfo')
  infoUrl.searchParams.set('iiprop', 'url')
  infoUrl.searchParams.set('format', 'json')
  infoUrl.searchParams.set('origin', '*')

  const infoRes = await fetch(infoUrl.toString(), { signal })
  if (!infoRes.ok) return undefined

  const infoData = (await infoRes.json()) as {
    query?: {
      pages?: Record<
        string,
        { imageinfo?: Array<{ url?: string }> }
      >
    }
  }

  const pages = infoData.query?.pages ?? {}
  const first = Object.values(pages)[0]
  return first?.imageinfo?.[0]?.url
}
