/** Postgres/Supabase uuid primary keys (string form). Rejects mock ids like `f11`, `o6`, `c1`. */
const DB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isDbUuid(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false
  const id = value.trim()
  if (!id) return false
  return DB_UUID_RE.test(id)
}
