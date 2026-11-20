/**
 * Parse JSON from an API Response. Detects static hosts (Cloudflare Pages)
 * that return HTML for /api/* instead of the Node handlers.
 */
export async function readApiJson<T extends Record<string, unknown>>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const ctype = res.headers.get('content-type') ?? ''
  const text = await res.text()
  if (
    ctype.includes('text/html') ||
    text.trimStart().startsWith('<!DOCTYPE') ||
    text.trimStart().startsWith('<!doctype') ||
    text.trimStart().startsWith('<html')
  ) {
    return { ok: false, error: 'api_unreachable' }
  }
  if (!text.trim()) {
    if (res.status === 405 || res.status === 404 || res.status >= 500) {
      return { ok: false, error: 'api_unreachable' }
    }
    return { ok: false, error: 'invalid_json' }
  }
  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    if (res.status >= 500) return { ok: false, error: 'server_error' }
    if (res.status === 405 || res.status === 404) {
      return { ok: false, error: 'api_unreachable' }
    }
    return { ok: false, error: 'invalid_json' }
  }
}
