import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { dbMode, json, sql } from './db'

export type AppRole = 'admin' | 'medium'

export type AppUser = {
  id: string
  nome: string
  role: AppRole
  email: string | null
  cpf: string | null
  celular: string | null
  filhoId: string | null
  ativo: boolean
}

export type AppSession = {
  user: AppUser
  sessionId: string
}

const COOKIE = 'sr_omulu_sess'
const SESSION_DAYS = 14

type UsuarioRow = {
  id: string
  nome: string
  role: string
  email: string | null
  cpf: string | null
  celular: string | null
  password_hash: string
  filho_id: string | null
  ativo: boolean
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function normalizeCelular(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function detectIdentificador(raw: string): {
  kind: 'email' | 'cpf' | 'celular'
  value: string
} {
  const trimmed = raw.trim()
  if (trimmed.includes('@')) {
    return { kind: 'email', value: normalizeEmail(trimmed) }
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0') === false) {
    // CPF is 11 digits; BR mobile often 10–11 with DDD
    // Prefer CPF when exactly 11 and no leading country code heuristics
  }
  if (digits.length === 11 && !trimmed.includes('@')) {
    // Ambiguous: could be CPF or celular. Prefer CPF if valid-ish check digit, else celular.
    if (isLikelyCpf(digits)) return { kind: 'cpf', value: digits }
    return { kind: 'celular', value: digits }
  }
  if (digits.length >= 10 && digits.length <= 13) {
    return { kind: 'celular', value: digits }
  }
  if (digits.length === 11) return { kind: 'cpf', value: digits }
  return { kind: 'email', value: normalizeEmail(trimmed) }
}

function isLikelyCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  const calc = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  const d1 = calc(digits.slice(0, 9), 10)
  const d2 = calc(digits.slice(0, 10), 11)
  return d1 === Number(digits[9]) && d2 === Number(digits[10])
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function rowToUser(row: UsuarioRow): AppUser {
  return {
    id: row.id,
    nome: row.nome,
    role: row.role === 'admin' ? 'admin' : 'medium',
    email: row.email,
    cpf: row.cpf,
    celular: row.celular,
    filhoId: row.filho_id,
    ativo: Boolean(row.ativo),
  }
}

export function publicUser(user: AppUser) {
  return {
    id: user.id,
    nome: user.nome,
    role: user.role,
    email: user.email,
    cpf: user.cpf,
    celular: user.celular,
    filhoId: user.filhoId,
  }
}

function cookieHeader(token: string, maxAgeSec: number): string {
  const secure =
    process.env.CURSOR_APP_ID || process.env.VERCEL || process.env.NODE_ENV === 'production'
      ? '; Secure'
      : ''
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

/** Active admins (login eligibility). */
export async function countAdmins(): Promise<number> {
  const rows = await sql<{ n: string | number }>(
    `select count(*)::int as n from usuarios where role = 'admin' and ativo = true`,
  )
  return Number(rows[0]?.n ?? 0)
}

/**
 * Any admin row (active or not). Used to permanently close open bootstrap
 * so deactivating the last admin cannot reopen public signup.
 */
export async function countAdminRows(): Promise<number> {
  const rows = await sql<{ n: string | number }>(
    `select count(*)::int as n from usuarios where role = 'admin'`,
  )
  return Number(rows[0]?.n ?? 0)
}

/**
 * Shared install secret for one-time bootstrap.
 * Must be set via BOOTSTRAP_SECRET (Cursor app secret / local env).
 * No hardcoded fallback — absence closes the endpoint.
 */
export function getBootstrapSecret(): string | null {
  const fromEnv = process.env.BOOTSTRAP_SECRET?.trim()
  return fromEnv || null
}

export function bootstrapAvailable(): boolean {
  return getBootstrapSecret() != null
}

export function checkBootstrapToken(provided: string): boolean {
  const expected = getBootstrapSecret()
  if (!expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Simple in-memory login throttle (per process). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function checkLoginThrottle(
  key: string,
  limit = 8,
  windowMs = 15 * 60 * 1000,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const cur = loginAttempts.get(key)
  if (!cur || cur.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) }
  }
  cur.count += 1
  return { ok: true }
}

export function clearLoginThrottle(key: string) {
  loginAttempts.delete(key)
}

export function clientKey(request: Request, identificador: string): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = fwd || request.headers.get('x-real-ip') || 'unknown'
  return `${ip}|${identificador.trim().toLowerCase()}`
}

export async function findUserByIdentificador(
  identificador: string,
): Promise<UsuarioRow | null> {
  const { kind, value } = detectIdentificador(identificador)
  if (!value) return null
  if (kind === 'email') {
    const rows = await sql<UsuarioRow>(
      `select * from usuarios where lower(email) = $1 and ativo = true limit 1`,
      [value],
    )
    return rows[0] ?? null
  }
  if (kind === 'cpf') {
    const rows = await sql<UsuarioRow>(
      `select * from usuarios where cpf = $1 and ativo = true limit 1`,
      [value],
    )
    return rows[0] ?? null
  }
  const rows = await sql<UsuarioRow>(
    `select * from usuarios where celular = $1 and ativo = true limit 1`,
    [value],
  )
  return rows[0] ?? null
}

export async function createSession(usuarioId: string): Promise<{
  token: string
  setCookie: string
}> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await sql(
    `insert into sessoes (usuario_id, token_hash, expires_at) values ($1, $2, $3)`,
    [usuarioId, tokenHash, expires.toISOString()],
  )
  return {
    token,
    setCookie: cookieHeader(token, SESSION_DAYS * 24 * 60 * 60),
  }
}

export async function destroySession(request: Request): Promise<string> {
  const token = readCookie(request, COOKIE)
  if (token) {
    await sql(`delete from sessoes where token_hash = $1`, [hashToken(token)])
  }
  return clearSessionCookie()
}

export async function getAppSession(
  request: Request,
): Promise<AppSession | null> {
  const bearer = request.headers.get('authorization')
  const token =
    bearer?.toLowerCase().startsWith('bearer ')
      ? bearer.slice(7).trim()
      : readCookie(request, COOKIE)
  if (!token) return null

  const rows = await sql<
    UsuarioRow & { session_id: string; expires_at: string }
  >(
    `select u.*, s.id as session_id, s.expires_at
     from sessoes s
     join usuarios u on u.id = s.usuario_id
     where s.token_hash = $1
     limit 1`,
    [hashToken(token)],
  )
  const row = rows[0]
  if (!row || !row.ativo) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await sql(`delete from sessoes where id = $1`, [row.session_id])
    return null
  }
  return { user: rowToUser(row), sessionId: row.session_id }
}

export async function requireAppSession(
  request: Request,
): Promise<AppSession | Response> {
  const session = await getAppSession(request)
  if (!session) {
    return json({ error: 'unauthorized', reason: 'login_required' }, 401)
  }
  return session
}

export function requireAdmin(session: AppSession): AppSession | Response {
  if (session.user.role !== 'admin') {
    return json({ error: 'forbidden', reason: 'admin_required' }, 403)
  }
  return session
}

/** Admin: any filho. Médium: only linked filho_id. */
export function canAccessFilho(
  session: AppSession,
  filhoId: string,
): boolean {
  if (session.user.role === 'admin') return true
  return Boolean(session.user.filhoId && session.user.filhoId === filhoId)
}

export function filhoScopeSql(session: AppSession): {
  clause: string
  params: unknown[]
} {
  if (session.user.role === 'admin') return { clause: '', params: [] }
  if (!session.user.filhoId) {
    return { clause: ' and false', params: [] }
  }
  return { clause: ' and id = $1', params: [session.user.filhoId] }
}

export function filhoIdScopeSql(
  session: AppSession,
  column = 'filho_id',
  startIndex = 1,
): { clause: string; params: unknown[] } {
  if (session.user.role === 'admin') return { clause: '', params: [] }
  if (!session.user.filhoId) return { clause: ' and false', params: [] }
  return {
    clause: ` and ${column} = $${startIndex}`,
    params: [session.user.filhoId],
  }
}

export { dbMode, json, sql, COOKIE as SESSION_COOKIE }
