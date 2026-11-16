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
    const adminRows = await countAdminRows()
    const needsBootstrap =
      adminRows === 0 && bootstrapAvailable() && !session

    if (!session) {
      return json({
        authenticated: false,
        needsBootstrap,
      })
    }
    return json({
      authenticated: true,
      needsBootstrap: false,
      user: publicUser(session.user),
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
