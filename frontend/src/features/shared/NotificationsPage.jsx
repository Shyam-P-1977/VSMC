import { useState } from 'react'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import * as api from '../../api'
import { useAsync } from '../../lib/hooks'
import { fmtDateTime } from '../../lib/format'
import { Button, EmptyState, PageHeader, Pagination, SkeletonRows, cx } from '../../components/ui'

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const { data, loading, reload } = useAsync(() => api.notifications.list({ page, per_page: 15 }), [page])

  const refreshBell = () => window.dispatchEvent(new Event('vscms:notifications'))
  const readOne = async (n) => { if (!n.is_read) { await api.notifications.read(n.id); reload(); refreshBell() } }
  const readAll = async () => { await api.notifications.readAll(); reload(); refreshBell() }

  return (
    <>
      <PageHeader title="Notifications" subtitle={data ? `${data.unread_count} unread` : ' '}
        actions={<Button variant="secondary" onClick={readAll} disabled={!data?.unread_count}><CheckCheck className="h-4 w-4" />Mark all as read</Button>} />
      <div className="card overflow-hidden">
        {loading && !data ? <SkeletonRows /> : data?.items.length === 0 ? (
          <EmptyState icon={BellOff} title="No notifications yet" text="Booking updates, invoices and payment confirmations will show up here." />
        ) : (
          <>
            <ul>
              {data.items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => readOne(n)} className={cx('flex w-full items-start gap-3 border-b border-line/60 px-5 py-4 text-left transition hover:bg-surface-2', !n.is_read && 'bg-brand-50/60')}>
                    <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', n.is_read ? 'bg-surface-2 text-muted' : 'bg-brand-500 text-white')}><Bell className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block text-sm', !n.is_read && 'font-semibold')}>{n.message}</span>
                      <span className="text-xs text-muted">{fmtDateTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </>
        )}
      </div>
    </>
  )
}
