import { Link, Outlet } from 'react-router-dom'
import { HelpCircle, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ROLE_HOME } from '../../lib/format'
import { Logo } from '../../components/ui'

export function PublicHeader({ dark = false }) {
  const { user } = useAuth()
  const theme = useTheme()
  return (
    <header className={`relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 ${dark ? 'text-white' : ''}`}>
      <Link to="/"><Logo light={dark || theme.dark} /></Link>
      <nav className="flex items-center gap-1.5 sm:gap-2">
        <Link to="/help" className={`btn-ghost !px-2.5 ${dark ? '!text-slate-300 hover:!text-white hover:!bg-white/10' : ''}`}><HelpCircle className="h-4 w-4" /><span className="hidden sm:inline">Help</span></Link>
        <button onClick={theme.toggle} className={`btn-ghost !p-2 ${dark ? '!text-slate-300 hover:!bg-white/10' : ''}`} aria-label="Toggle dark mode">{theme.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        {user ? (
          <Link to={ROLE_HOME[user.role]} className="btn-primary">Open dashboard</Link>
        ) : (
          <>
            <Link to="/login" className={`btn-ghost ${dark ? '!text-slate-200 hover:!bg-white/10' : ''}`}>Log in</Link>
            <Link to="/register" className="btn-primary">Get started</Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default function PublicShell() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <Outlet />
    </div>
  )
}
