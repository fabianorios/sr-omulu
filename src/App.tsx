import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Agenda } from './pages/Agenda'
import { Financeiro } from './pages/Financeiro'
import { Filhos } from './pages/Filhos'
import { Config } from './pages/Config'
import { Usuarios } from './pages/Usuarios'
import { Login } from './pages/Login'

function ProtectedApp() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Carregando…
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <AppProvider>
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
    </AppProvider>
  )
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
