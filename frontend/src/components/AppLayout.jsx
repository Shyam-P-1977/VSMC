import { useState, useMemo } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, BookOpen, CalendarClock, CalendarPlus, ClipboardList, Clock, Car, CreditCard, FileText, HelpCircle,
  History, LayoutDashboard, LogOut, Menu, Moon, Package, Receipt, Sun, Tag, UserCircle, Users, Wrench, X, Inbox,
  Search, ChevronRight, MenuSquare
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from './NotificationBell'
import { Logo, cx, Avatar } from './ui'
import { ErrorBoundary } from './ErrorBoundary'

const NAV = {
  customer: [
    ['/customer', 'Dashboard', LayoutDashboard, true],
    ['/customer/vehicles', 'My Vehicles', Car],
    ['/customer/book', 'Book Service', CalendarPlus],
    ['/customer/bookings', 'My Bookings', ClipboardList],
    ['/customer/invoices', 'Invoices', Receipt],
    ['/customer/history', 'Service History', History],
    ['/customer/notifications', 'Notifications', Bell],
    ['/customer/profile', 'Profile', UserCircle],
  ],
  admin: [
    ['/admin', 'Dashboard', LayoutDashboard, true],
    ['/admin/requests', 'Pending Requests', Inbox],
    ['/admin/bookings', 'All Bookings', ClipboardList],
    ['/admin/customers', 'Customers', Users],
    ['/admin/mechanics', 'Mechanics', Wrench],
    ['/admin/services', 'Service Catalog', Tag],
    ['/admin/slots', 'Slots & Settings', CalendarClock],
    ['/admin/inventory', 'Spare Parts', Package],
    ['/admin/invoices', 'Invoices & Payments', CreditCard],
    ['/admin/reports', 'Reports', BarChart3],
    ['/admin/notifications', 'Notifications', Bell],
    ['/admin/profile', 'Profile', UserCircle],
  ],
  mechanic: [
    ['/mechanic', 'My Jobs', LayoutDashboard, true],
    ['/mechanic/history', 'Job History', History],
    ['/mechanic/notifications', 'Notifications', Bell],
    ['/mechanic/profile', 'Profile', UserCircle],
  ],
}

const ROLE_LABEL = { customer: 'Customer', admin: 'Administrator', mechanic: 'Mechanic' }

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const links = NAV[user.role] || []

  const doLogout = () => { logout(); nav('/login') }

  const currentPage = useMemo(() => {
    const match = links.find(([to, _, __, end]) => end ? loc.pathname === to : loc.pathname.startsWith(to))
    return match ? match[1] : 'Page'
  }, [loc.pathname, links])

  const sidebarWidth = collapsed ? 'w-20' : 'w-64'

  const sidebar = (
    <div className="flex h-full flex-col bg-night-900 text-slate-300 shadow-xl transition-all duration-300">
      <div className={cx("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        <Link to={`/${user.role}`} className={collapsed ? "hidden" : "block"}><Logo light /></Link>
        {collapsed && <Link to={`/${user.role}`} className="font-display font-bold text-white text-xl">V<span className="text-brand-500">.</span></Link>}
        <button className="lg:hidden text-slate-400 p-1" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        <button className="hidden lg:block text-slate-400 p-1 hover:text-white" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
          <MenuSquare className="h-5 w-5" />
        </button>
      </div>
      
      {!collapsed && (
        <div className="px-4 pb-3 pt-2">
          <div className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 flex items-center gap-3">
            <Avatar name={user.name} size="sm" />
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-brand-400">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 mt-2" aria-label="Main navigation">
        {links.map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} title={collapsed ? label : undefined}
            className={({ isActive }) => cx('group flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200',
              collapsed ? 'justify-center px-0' : 'px-3',
              isActive ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-white')}>
            <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="border-t border-white/10 p-3">
        <button onClick={doLogout} title={collapsed ? "Log out" : undefined} className={cx("flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/15 hover:text-red-300 w-full", collapsed ? "justify-center px-0" : "px-3")}>
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className={cx("min-h-screen transition-all duration-300", collapsed ? "lg:pl-20" : "lg:pl-64")}>
      <aside className={cx("fixed inset-y-0 left-0 z-30 hidden lg:block transition-all duration-300", sidebarWidth)}>
        {sidebar}
      </aside>
      
      {/* Mobile Sidebar Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-night-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-pop">{sidebar}</aside>
        </div>
      )}
      
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/80 px-4 backdrop-blur-lg sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          
          <div className="hidden sm:flex items-center text-sm font-medium text-muted">
            <Link to={`/${user.role}`} className="hover:text-brand-600 transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4 mx-1 opacity-50" />
            <span className="text-ink font-semibold">{currentPage}</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
          <div className="hidden md:flex relative max-w-xs w-full mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input type="text" placeholder="Search..." className="input !py-2 !pl-9 !rounded-full bg-surface-2 border-transparent focus:bg-surface w-full text-sm transition-all focus:max-w-md" />
          </div>

          <button className="btn-ghost !p-2 rounded-full" onClick={toggle} aria-label="Toggle dark mode">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <NotificationBell />

          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-full p-1 border border-line bg-surface hover:border-brand-300 transition focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <Avatar name={user.name} size="sm" />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-line bg-surface py-1 shadow-lg z-20 animate-fade-up">
                  <div className="px-4 py-2 border-b border-line mb-1">
                    <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                  </div>
                  <Link to={`/${user.role}/profile`} className="block px-4 py-2 text-sm text-ink hover:bg-surface-2 transition-colors" onClick={() => setProfileOpen(false)}>My Profile</Link>
                  <Link to="/help" className="block px-4 py-2 text-sm text-ink hover:bg-surface-2 transition-colors" onClick={() => setProfileOpen(false)}>Help & FAQ</Link>
                  <div className="h-px bg-line my-1" />
                  <button onClick={doLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">Log out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8" key={loc.pathname}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
