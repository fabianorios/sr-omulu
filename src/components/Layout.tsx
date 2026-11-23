import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NovoFilhoModal } from './modals/NovoFilhoModal'
import { AgendarObrigacaoModal } from './modals/AgendarObrigacaoModal'
import { NovaCobrancaModal } from './modals/NovaCobrancaModal'
import { NovaObrigacaoModal } from './modals/NovaObrigacaoModal'

export function Layout() {
  const {
    openNovoFilho,
    editingFilho,
    openAgendar,
    openNovaCobranca,
    openNovaObrigacao,
    setOpenNovoFilho,
    setEditingFilho,
    setOpenAgendar,
    setOpenNovaCobranca,
    setOpenNovaObrigacao,
  } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const formOpen = openNovoFilho || editingFilho != null

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:px-8">
          <Outlet />
        </main>
      </div>

      {formOpen && (
        <NovoFilhoModal
          key={editingFilho?.id ?? 'new'}
          initial={editingFilho}
          onClose={() => {
            setOpenNovoFilho(false)
            setEditingFilho(null)
          }}
        />
      )}
      {openAgendar && (
        <AgendarObrigacaoModal onClose={() => setOpenAgendar(false)} />
      )}
      {openNovaCobranca && (
        <NovaCobrancaModal onClose={() => setOpenNovaCobranca(false)} />
      )}
      {openNovaObrigacao && (
        <NovaObrigacaoModal onClose={() => setOpenNovaObrigacao(false)} />
      )}
    </div>
  )
}
