import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

type HandlerModule = {
  GET?: (req: Request) => Promise<Response> | Response
  POST?: (req: Request) => Promise<Response> | Response
  PATCH?: (req: Request) => Promise<Response> | Response
  DELETE?: (req: Request) => Promise<Response> | Response
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function toWebHeaders(req: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else {
      headers.set(key, value)
    }
  }
  return headers
}

async function toWebRequest(
  req: IncomingMessage,
  url: string,
): Promise<Request> {
  const method = (req.method ?? 'GET').toUpperCase()
  const headers = toWebHeaders(req)
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers })
  }
  const raw = await readBody(req)
  return new Request(url, {
    method,
    headers,
    body: new Uint8Array(raw),
    // Required by Node's undici when Request has a body
    duplex: 'half',
  } as RequestInit)
}

async function writeWebResponse(
  res: ServerResponse,
  response: Response,
) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}

export function apiDevPlugin(): Plugin {
  return {
    name: 'sr-omulu-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const urlPath = req.url?.split('?')[0] ?? ''
          if (!urlPath.startsWith('/api/')) return next()

          const root = server.config.root
          let modPath: string | null = null
          if (urlPath === '/api/filhos' || urlPath === '/api/filhos/') {
            modPath = path.join(root, 'api/filhos.ts')
          } else {
            const match = urlPath.match(/^\/api\/filhos\/([^/]+)\/?$/)
            if (match) {
              modPath = path.join(root, 'api/filhos/[id].ts')
            }
          }

          if (!modPath) return next()

          const href = pathToFileURL(modPath).href + `?t=${Date.now()}`
          const mod = (await server.ssrLoadModule(href)) as HandlerModule
          const method = (req.method ?? 'GET').toUpperCase()
          const handler = mod[method as keyof HandlerModule]
          if (!handler) {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'method_not_allowed' }))
            return
          }

          const host = req.headers.host ?? '127.0.0.1:5173'
          const fullUrl = `http://${host}${req.url ?? urlPath}`
          const request = await toWebRequest(req, fullUrl)
          const response = await handler(request)
          await writeWebResponse(res, response)
        } catch (error) {
          console.error('[api-dev]', error)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'api_error',
            }),
          )
        }
      })
    },
  }
}
