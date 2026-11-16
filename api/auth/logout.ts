import { destroySession, json } from '../../lib/auth'

export async function POST(request: Request): Promise<Response> {
  try {
    const clear = await destroySession(request)
    return json({ ok: true }, 200, { 'set-cookie': clear })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
