import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import * as api from '../api'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../lib/format'
import { cx } from './ui'

export default function NotificationBell() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  const load = () =>
    api.notifications.list({ per_page: 8 }).then((d) => { setItems(d.items); setUnread(d.unread_count) }).catch(() => {})

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    window.addEventListener('vscms:notifications', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); window.removeEventListener('vscms:notifications', onFocus) }
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const readAll = async () => { await api.notifications.readAll(); load() }
  const openOne = async (n) => {
    if (!n.is_read) { await api.notifications.read(n.id).catch(() => {}); load() }
  }

  return (
    <div className="relative" ref={ref}>
      <button id="notification-bell" onClick={() => { setOpen(!open); if (!open) load() }} className="btn-ghost relative !p-2" aria-label={`Notifications, ${unread} unread`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pop">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] animate-pop overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && <button onClick={readAll} className="flex items-center gap-1 text-xs font-medium text-brand-600"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</p>}
            {items.map((n) => (
              <button key={n.id} onClick={() => openOne(n)} className={cx('flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition hover:bg-surface-2', !n.is_read && 'bg-brand-50/60')}>
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-brand-500')} />
                <span className="min-w-0">
                  <span className="block text-sm leading-snug">{n.message}</span>
                  <span className="text-xs text-muted">{timeAgo(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
          <Link to={`/${user.role}/notifications`} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-surface-2">View all</Link>
        </div>
      )}
    </div>
  )
}
