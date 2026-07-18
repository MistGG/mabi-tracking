/**
 * Tiny CORS proxy for Mabibase GraphQL so the GitHub Pages app can search items.
 * Only forwards /graphql (and OPTIONS preflight).
 */

const ALLOWED_ORIGINS = new Set([
  'https://mistgg.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

type Env = {
  UPSTREAM: string
}

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://mistgg.github.io'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    if (request.method !== 'POST' || !url.pathname.endsWith('/graphql')) {
      return new Response('Not found', { status: 404, headers: cors })
    }

    const upstream = new URL('/graphql', env.UPSTREAM)
    // Preserve Mabibase cache-busting query (e.g. ?t=1)
    upstream.search = url.search

    const upstreamRes = await fetch(upstream.toString(), {
      method: 'POST',
      headers: {
        'content-type':
          request.headers.get('content-type') ?? 'application/json',
      },
      body: request.body,
    })

    const headers = new Headers(cors)
    headers.set(
      'content-type',
      upstreamRes.headers.get('content-type') ?? 'application/json',
    )

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    })
  },
}
