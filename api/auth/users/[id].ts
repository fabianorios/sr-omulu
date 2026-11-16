import {
  detectIdentificador,
  hashPassword,
  json,
  publicUser,
  requireAdmin,
  requireAppSession,
  sql,
} from '../../../lib/auth'

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

function idFromUrl(request: Request): string | null {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'users' ? decodeURIComponent(last) : null
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

export async function PATCH(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const sets: string[] = []
  const params: unknown[] = []
  const push = (col: string, value: unknown) => {
    params.push(value)
    sets.push(`${col} = $${params.length}`)
  }

  if ('nome' in body) push('nome', String(body.nome).trim())
  if ('role' in body) {
    const role = String(body.role)
    if (role !== 'admin' && role !== 'medium') {
      return json({ error: 'invalid_role' }, 400)
    }
    push('role', role)
  }
  if ('ativo' in body) push('ativo', body.ativo === true)
  if ('filhoId' in body || 'filho_id' in body) {
    const fid = String(body.filhoId ?? body.filho_id ?? '').trim()
    push('filho_id', fid === '' ? null : fid)
  }
  if ('identificador' in body) {
    const { kind, value } = detectIdentificador(String(body.identificador))
    if (!value) return json({ error: 'invalid_identificador' }, 400)
    push('email', kind === 'email' ? value : null)
    push('cpf', kind === 'cpf' ? value : null)
    push('celular', kind === 'celular' ? value : null)
  }
  if ('senha' in body || 'password' in body) {
    const senha = String(body.senha ?? body.password ?? '')
    if (senha.length < 8) return json({ error: 'senha_min_8' }, 400)
    push('password_hash', hashPassword(senha))
  }

  if (sets.length === 0) return json({ error: 'empty_patch' }, 400)
  sets.push('updated_at = now()')
  params.push(id)

  try {
    const rows = await sql<UserRow>(
      `update usuarios set ${sets.join(', ')}
       where id = $${params.length}
       returning id, nome, role, email, cpf, celular, filho_id, ativo`,
      params,
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ user: toPublic(rows[0]) })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
