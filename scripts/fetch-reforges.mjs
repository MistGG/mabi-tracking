import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '../src/data/reforges.json')

const url = new URL('https://wiki.mabinogiworld.com/api.php')
url.searchParams.set('action', 'parse')
url.searchParams.set('page', 'Reforge/Full_List')
url.searchParams.set('prop', 'text')
url.searchParams.set('format', 'json')
url.searchParams.set('origin', '*')

const response = await fetch(url)
if (!response.ok) throw new Error(`Wiki fetch failed: ${response.status}`)
const data = await response.json()
const html = data.parse?.text?.['*']
if (!html) throw new Error('Missing parse HTML')

const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0])
const table = tables.find((t) => t.includes('Reforges Onto'))
if (!table) throw new Error('Reforge table not found')

function strip(cellHtml) {
  return cellHtml
    .replace(/<br\s*\/?>/gi, ', ')
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

const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0])
const reforges = []

for (const row of rows) {
  const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
    (m) => strip(m[1]),
  )
  if (cells.length < 4) continue
  if (cells[0] === 'Reforges Onto') continue
  if (cells.includes('Precise') && cells.includes('Exquisite')) continue

  const [
    onto,
    skill,
    attribute,
    effect,
    precise = '',
    exquisite = '',
    dazzling = '',
    limitBreak = '',
  ] = cells
  if (!onto || !attribute) continue

  reforges.push({
    id: String(reforges.length),
    onto: onto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    skill: !skill || skill === '-' ? null : skill,
    attribute,
    effect: effect || '',
    levels: { precise, exquisite, dazzling, limitBreak },
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(reforges)}\n`)
console.log(`Wrote ${reforges.length} reforges to ${outPath}`)
