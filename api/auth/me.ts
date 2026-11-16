import {
  bootstrapAvailable,
  countAdminRows,
  getAppSession,
  json,
  publicUser,
} from '../../lib/auth'

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getAppSession(request)

    // Returning users: skip the admin-count query (was always running before).
    if (session) {
      return json({
        authenticated: true,
        needsBootstrap: false,
        user: publicUser(session.user),
      })
    }

    // Anonymous: only hit DB for bootstrap flag when the secret is configured.
    let needsBootstrap = false
    if (bootstrapAvailable()) {
      const adminRows = await countAdminRows()
      needsBootstrap = adminRows === 0
    }

    return json({
      authenticated: false,
      needsBootstrap,
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
