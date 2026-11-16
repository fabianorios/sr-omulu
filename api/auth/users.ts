import {
  detectIdentificador,
  hashPassword,
  json,
  publicUser,
  requireAdmin,
  requireAppSession,
  sql,
  type AppRole,
} from '../../lib/auth'

type UserRow = {
  id: string
  nome: string
  role: string
  email: string | null
  cpf: string | null
  celular: string | null
  filho_id: string | null
  ativo: boolean
}

function toPublic(row: UserRow) {
  return publicUser({
    id: row.id,
    nome: row.nome,
    role: row.role === 'admin' ? 'admin' : 'medium',
    email: row.email,
    cpf: row.cpf,
    celular: row.celular,
    filhoId: row.filho_id,
    ativo: row.ativo,
  })
}

export async function GET(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  try {
    const users = await sql<UserRow>(
      `select id, nome, role, email, cpf, celular, filho_id, ativo
       from usuarios
       order by nome asc`,
    )
    return json({ users: users.map(toPublic) })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const nome = String(body.nome ?? '').trim()
  const role = String(body.role ?? 'medium') as AppRole
  const senha = String(body.senha ?? body.password ?? '')
  const identificador = String(body.identificador ?? '').trim()
  const filhoId = body.filhoId != null ? String(body.filhoId).trim() : ''

  if (!nome || !identificador || senha.length < 8) {
    return json({ error: 'nome_identificador_senha_min_8' }, 400)
  }
  if (role !== 'admin' && role !== 'medium') {
    return json({ error: 'invalid_role' }, 400)
  }
  if (role === 'medium' && !filhoId) {
    return json({ error: 'medium_requires_filho' }, 400)
  }

  const { kind, value } = detectIdentificador(identificador)
  if (!value) return json({ error: 'invalid_identificador' }, 400)

  try {
    const rows = await sql<UserRow>(
      `insert into usuarios (nome, role, email, cpf, celular, password_hash, filho_id, ativo)
       values ($1, $2, $3, $4, $5, $6, $7, true)
       returning id, nome, role, email, cpf, celular, filho_id, ativo`,
      [
        nome,
        role,
        kind === 'email' ? value : null,
        kind === 'cpf' ? value : null,
        kind === 'celular' ? value : null,
        hashPassword(senha),
        role === 'medium' ? filhoId : null,
      ],
    )
    return json({ user: toPublic(rows[0]) }, 201)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'db_error'
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return json({ error: 'identificador_em_uso' }, 409)
    }
    return json({ error: msg }, 500)
  }
}
