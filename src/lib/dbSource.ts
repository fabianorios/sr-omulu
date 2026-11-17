export type RemoteDbSource = 'supabase' | 'postgres' | 'pglite'

export function parseDbSource(raw: string | undefined): RemoteDbSource {
  if (raw === 'supabase' || raw === 'postgres') return raw
  return 'pglite'
}

export function isRemoteDbSource(
  source: string,
): source is RemoteDbSource {
  return source === 'supabase' || source === 'postgres' || source === 'pglite'
}
