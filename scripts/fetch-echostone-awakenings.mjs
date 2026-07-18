import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '../src/data/echostone-awakenings.json')

const COLORS = ['Red', 'Blue', 'Yellow', 'Silver', 'Black']

function strip(cellHtml) {
  return cellHtml
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#32;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPageHtml(page) {
  const url = new URL('https://wiki.mabinogiworld.com/api.php')
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', page)
  url.searchParams.set('prop', 'text')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Wiki fetch failed for ${page}: ${response.status}`)
  const data = await response.json()
  const html = data.parse?.text?.['*']
  if (!html) throw new Error(`Missing parse HTML for ${page}`)
  return html
}

function parseAwakenings(html, color) {
  const marker = 'id="Possible_Awakenings"'
  const start = html.indexOf(marker)
  if (start < 0) throw new Error(`Possible Awakenings not found for ${color}`)
  const tableStart = html.indexOf('<table', start)
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableStart < 0 || tableEnd < 0) {
    throw new Error(`Awakening table not found for ${color}`)
  }
  const table = html.slice(tableStart, tableEnd + '</table>'.length)
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0])

  let skill = null
  const awakenings = []

  for (const row of rows) {
    const header = row.match(/<th[^>]*colspan="[^"]*"[^>]*>([\s\S]*?)<\/th>/i)
    if (header) {
      const name = strip(header[1])
      if (
        name &&
        !/awakening name|effect description|level cap|appearance rate/i.test(name)
      ) {
        skill = name
      }
      continue
    }

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      strip(m[1]),
    )
    if (cells.length < 2) continue
    const [attribute, effect, levelCap = ''] = cells
    if (!attribute) continue

    awakenings.push({
      id: `echo-${color.toLowerCase()}-${awakenings.length}`,
      color,
      onto: [`${color} Echostone`],
      skill,
      attribute,
      effect: effect || '',
      levels: {
        precise: '',
        exquisite: '',
        dazzling: '',
        limitBreak: levelCap,
      },
    })
  }

  return awakenings
}

const all = []
for (const color of COLORS) {
  const html = await fetchPageHtml(`${color}_Echostone`)
  const rows = parseAwakenings(html, color)
  console.log(`${color}: ${rows.length} awakenings`)
  all.push(...rows)
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(all)}\n`)
console.log(`Wrote ${all.length} awakenings to ${outPath}`)
