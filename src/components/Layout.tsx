import { Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NovoFilhoModal } from './modals/NovoFilhoModal'
import { AgendarObrigacaoModal } from './modals/AgendarObrigacaoModal'

export function Layout() {
  const {
    openNovoFilho,
    openAgendar,
    setOpenNovoFilho,
    setOpenAgendar,
  } = useApp()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto px-6 py-6 md:px-8">
          <Outlet />
        </main>
      </div>

      {openNovoFilho && (
        <NovoFilhoModal onClose={() => setOpenNovoFilho(false)} />
      )}
      {openAgendar && (
        <AgendarObrigacaoModal onClose={() => setOpenAgendar(false)} />
      )}
    </div>
  )
}
