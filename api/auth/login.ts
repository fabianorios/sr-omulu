import {
  checkLoginThrottle,
  clearLoginThrottle,
  clientKey,
  createSession,
  findUserByIdentificador,
  json,
  publicUser,
  verifyPassword,
} from '../../lib/auth'

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const identificador = String(body.identificador ?? body.login ?? '').trim()
  const senha = String(body.senha ?? body.password ?? '')
  if (!identificador || !senha) {
    return json({ error: 'identificador_senha_required' }, 400)
  }

  const throttleKey = clientKey(request, identificador)
  const throttle = checkLoginThrottle(throttleKey)
  if (!throttle.ok) {
    return json(
      { error: 'too_many_attempts', retryAfterSec: throttle.retryAfterSec },
      429,
      { 'retry-after': String(throttle.retryAfterSec) },
    )
  }

  try {
    const user = await findUserByIdentificador(identificador)
    if (!user || !verifyPassword(senha, user.password_hash)) {
      return json({ error: 'invalid_credentials' }, 401)
    }
    clearLoginThrottle(throttleKey)
    const session = await createSession(user.id)
    return json(
      {
        user: publicUser({
          id: user.id,
          nome: user.nome,
          role: user.role === 'admin' ? 'admin' : 'medium',
          email: user.email,
          cpf: user.cpf,
          celular: user.celular,
          filhoId: user.filho_id,
          ativo: user.ativo,
        }),
      },
      200,
      { 'set-cookie': session.setCookie },
    )
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
