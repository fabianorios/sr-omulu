import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Agenda = lazy(() =>
  import('./pages/Agenda').then((m) => ({ default: m.Agenda })),
)
const Financeiro = lazy(() =>
  import('./pages/Financeiro').then((m) => ({ default: m.Financeiro })),
)
const Filhos = lazy(() =>
  import('./pages/Filhos').then((m) => ({ default: m.Filhos })),
)
const Config = lazy(() =>
  import('./pages/Config').then((m) => ({ default: m.Config })),
)
const Usuarios = lazy(() =>
  import('./pages/Usuarios').then((m) => ({ default: m.Usuarios })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--color-ink-muted)]">
      Carregando…
    </div>
  )
}

/** Authenticated shell — kept in a separate chunk so the login page stays light. */
export default function AuthenticatedApp() {
  const { isAdmin } = useAuth()

  return (
    <AppProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="filhos" element={<Filhos />} />
            {isAdmin ? <Route path="config" element={<Config />} /> : null}
            {isAdmin ? <Route path="usuarios" element={<Usuarios />} /> : null}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AppProvider>
  )
}
