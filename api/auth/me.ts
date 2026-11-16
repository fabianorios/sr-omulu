import { getAppSession, json, publicUser } from '../../lib/auth'
import { countAdmins } from '../../lib/auth'

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getAppSession(request)
    const admins = await countAdmins()
    if (!session) {
      return json({
        authenticated: false,
        needsBootstrap: admins === 0,
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
