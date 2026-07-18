const WIKI_API = 'https://wiki.mabinogiworld.com/api.php'
const WIKI_VIEW = 'https://wiki.mabinogiworld.com/view'

export type WikiInlineSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string }

export type EnchantDropSource = {
  enchantName: string
  wikiTitle: string
  wikiUrl: string
  locations: WikiInlineSegment[][]
}

const cache = new Map<string, EnchantDropSource>()

export function wikiViewUrl(title: string): string {
  const hashIndex = title.indexOf('#')
  const page = hashIndex >= 0 ? title.slice(0, hashIndex) : title
  const hash = hashIndex >= 0 ? title.slice(hashIndex + 1) : ''
  const path = encodeURIComponent(page.trim().replace(/ /g, '_'))
  if (!hash) return `${WIKI_VIEW}/${path}`
  return `${WIKI_VIEW}/${path}#${encodeURIComponent(hash.trim().replace(/ /g, '_'))}`
}

/** Plain-text fallback for wiki inline markup. */
export function cleanWikiInline(text: string): string {
  return parseWikiInline(text)
    .map((seg) => seg.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse wiki link markup into text/link segments for rendering. */
export function parseWikiInline(text: string): WikiInlineSegment[] {
  const segments: WikiInlineSegment[] = []
  const pushText = (value: string) => {
    if (!value) return
    const cleaned = value.replace(/'{2,}/g, '')
    if (!cleaned) return
    const last = segments[segments.length - 1]
    if (last?.type === 'text') last.text += cleaned
    else segments.push({ type: 'text', text: cleaned })
  }

  let i = 0
  while (i < text.length) {
    // [[target|label]] or [[target]]
    if (text.startsWith('[[', i)) {
      const end = text.indexOf(']]', i + 2)
      if (end === -1) {
        pushText(text.slice(i))
        break
      }
      const inner = text.slice(i + 2, end)
      const pipe = inner.indexOf('|')
      const target = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim()
      const label = (pipe >= 0 ? inner.slice(pipe + 1) : inner)
        .replace(/'{2,}/g, '')
        .trim()
      if (target && label && !target.startsWith('Category:')) {
        segments.push({
          type: 'link',
          text: label || target,
          href: wikiViewUrl(target),
        })
      } else if (label || target) {
        pushText(label || target)
      }
      i = end + 2
      continue
    }

    // [https://url label] or [http://url label]
    if (text.startsWith('[http://', i) || text.startsWith('[https://', i)) {
      const end = text.indexOf(']', i + 1)
      if (end === -1) {
        pushText(text.slice(i))
        break
      }
      const inner = text.slice(i + 1, end).trim()
      const space = inner.search(/\s/)
      if (space > 0) {
        const href = inner.slice(0, space)
        const label = inner.slice(space + 1).replace(/'{2,}/g, '').trim()
        segments.push({ type: 'link', text: label || href, href })
      } else {
        segments.push({ type: 'link', text: inner, href: inner })
      }
      i = end + 1
      continue
    }

    const nextWiki = text.indexOf('[[', i)
    const nextHttp = (() => {
      const a = text.indexOf('[http://', i)
      const b = text.indexOf('[https://', i)
      if (a < 0) return b
      if (b < 0) return a
      return Math.min(a, b)
    })()
    let next = -1
    if (nextWiki >= 0 && nextHttp >= 0) next = Math.min(nextWiki, nextHttp)
    else if (nextWiki >= 0) next = nextWiki
    else next = nextHttp

    if (next === -1) {
      pushText(text.slice(i))
      break
    }
    pushText(text.slice(i, next))
    i = next
  }

  return segments
}

function parseObtainedFrom(wikitext: string): WikiInlineSegment[][] {
  const match = wikitext.match(
    /\|enchantObtainedFrom\s*=\s*([\s\S]*?)(?=\n\s*\||\n\s*\}\})/,
  )
  if (!match?.[1]) return []

  return match[1]
    .split(';;')
    .map((part) => parseWikiInline(part.trim()))
    .filter((segments) => segments.some((s) => s.text.trim()))
}

async function fetchWikitext(
  title: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = new URL(WIKI_API)
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', title)
  url.searchParams.set('prop', 'wikitext')
  url.searchParams.set('redirects', '1')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) return null

  const data = (await res.json()) as {
    error?: { code?: string }
    parse?: { title?: string; wikitext?: { '*': string } }
  }
  if (data.error || !data.parse?.wikitext?.['*']) return null
  return data.parse.wikitext['*']
}

async function resolveEnchantWikiTitle(
  enchantName: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const candidates = [enchantName, `${enchantName} (Enchant)`]
  for (const title of candidates) {
    const text = await fetchWikitext(title, signal)
    if (text && /\|enchantName\s*=/.test(text)) return title
    if (text && /\|enchantObtainedFrom\s*=/.test(text)) return title
  }

  const searchUrl = new URL(WIKI_API)
  searchUrl.searchParams.set('action', 'query')
  searchUrl.searchParams.set('list', 'search')
  searchUrl.searchParams.set(
    'srsearch',
    `enchantName=${enchantName} OR intitle:"${enchantName}"`,
  )
  searchUrl.searchParams.set('srlimit', '8')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('origin', '*')

  const searchRes = await fetch(searchUrl.toString(), { signal })
  if (!searchRes.ok) return null
  const searchData = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string }> }
  }
  const hits = searchData.query?.search ?? []
  for (const hit of hits) {
    const text = await fetchWikitext(hit.title, signal)
    if (!text) continue
    if (
      new RegExp(
        `\\|enchantName\\s*=\\s*${enchantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i',
      ).test(text)
    ) {
      return hit.title
    }
  }
  return null
}

/** Load drop / obtain locations from the Mabibase-linked Mabinogi wiki enchant page. */
export async function fetchEnchantDropSources(
  enchantName: string,
  signal?: AbortSignal,
): Promise<EnchantDropSource> {
  const key = enchantName.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const empty: EnchantDropSource = {
    enchantName,
    wikiTitle: enchantName,
    wikiUrl: wikiViewUrl(enchantName),
    locations: [],
  }

  try {
    const title = await resolveEnchantWikiTitle(enchantName, signal)
    if (!title) {
      cache.set(key, empty)
      return empty
    }

    const wikitext = await fetchWikitext(title, signal)
    const locations = wikitext ? parseObtainedFrom(wikitext) : []
    const result: EnchantDropSource = {
      enchantName,
      wikiTitle: title,
      wikiUrl: wikiViewUrl(title),
      locations,
    }
    cache.set(key, result)
    return result
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    cache.set(key, empty)
    return empty
  }
}

export async function fetchManyEnchantDropSources(
  enchantNames: string[],
  signal?: AbortSignal,
): Promise<EnchantDropSource[]> {
  const unique = [...new Set(enchantNames.map((n) => n.trim()).filter(Boolean))]
  const results = await Promise.all(
    unique.map((name) => fetchEnchantDropSources(name, signal)),
  )
  return results
}
