import { lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'))

function BootFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
      Carregando…
    </div>
  )
}

/** Cookie hint only — avoids a login flash for returning sessions. */
function hasSessionCookieHint(): boolean {
  try {
    return document.cookie.split(';').some((part) => {
      const name = part.trim().split('=')[0]
      return name === 'sr_omulu_sess'
    })
  } catch {
    return false
  }
}

function ProtectedApp() {
  const { user, loading } = useAuth()

  if (user) {
    return (
      <Suspense fallback={<BootFallback />}>
        <AuthenticatedApp />
      </Suspense>
    )
  }

  // Returning visitor with a session cookie: wait for /me instead of flashing Login.
  if (loading && hasSessionCookieHint()) {
    return <BootFallback />
  }

  return <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedApp />
      </BrowserRouter>
    </AuthProvider>
  )
}
