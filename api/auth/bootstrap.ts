import {
  countAdmins,
  createSession,
  detectIdentificador,
  hashPassword,
  json,
  publicUser,
  sql,
} from '../../lib/auth'

/**
 * One-time first admin creation when no admins exist.
 * Body: { nome, identificador (email|cpf|celular), senha }
 */
export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  try {
    const admins = await countAdmins()
    if (admins > 0) {
      return json({ error: 'bootstrap_closed' }, 403)
    }

    const nome = String(body.nome ?? '').trim()
    const identificador = String(body.identificador ?? '').trim()
    const senha = String(body.senha ?? body.password ?? '')
    if (!nome || !identificador || senha.length < 8) {
      return json({ error: 'nome_identificador_senha_min_8' }, 400)
    }

    const { kind, value } = detectIdentificador(identificador)
    if (!value) return json({ error: 'invalid_identificador' }, 400)

    const email = kind === 'email' ? value : null
    const cpf = kind === 'cpf' ? value : null
    const celular = kind === 'celular' ? value : null
    const passwordHash = hashPassword(senha)

    const rows = await sql<{
      id: string
      nome: string
      role: string
      email: string | null
      cpf: string | null
      celular: string | null
      filho_id: string | null
      ativo: boolean
    }>(
      `insert into usuarios (nome, role, email, cpf, celular, password_hash, ativo)
       values ($1, 'admin', $2, $3, $4, $5, true)
       returning id, nome, role, email, cpf, celular, filho_id, ativo`,
      [nome, email, cpf, celular, passwordHash],
    )
    const user = rows[0]
    if (!user) return json({ error: 'create_failed' }, 500)

    const session = await createSession(user.id)
    return json(
      {
        user: publicUser({
          id: user.id,
          nome: user.nome,
          role: 'admin',
          email: user.email,
          cpf: user.cpf,
          celular: user.celular,
          filhoId: user.filho_id,
          ativo: user.ativo,
        }),
        bootstrapped: true,
      },
      201,
      { 'set-cookie': session.setCookie },
    )
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
