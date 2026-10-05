import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'
import * as api from '../../api'
import { useAsync, useDebounced } from '../../lib/hooks'
import { fmtDate, inr } from '../../lib/format'
import { EmptyState, Pagination, SkeletonRows, StatusBadge, cx } from '../../components/ui'

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Awaiting Parts', 'Completed', 'Cancelled']

/** Reusable request table with filters. detailPath(r) -> link target. */
export default function RequestTable({ detailPath, showCustomer, searchable, extraParams, initialStatus = '', emptyAction, actions, refreshKey, title }) {
  const [status, setStatus] = useState(initialStatus)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  const { data, loading } = useAsync(
    () => api.requests.list({ status: status || undefined, q: dq || undefined, date_from: from || undefined, date_to: to || undefined, page, per_page: 10, ...extraParams }),
    [status, dq, from, to, page, refreshKey, JSON.stringify(extraParams)],
  )
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        {title && <h2 className="mr-auto font-semibold">{title}</h2>}
        {searchable && (
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <input className="input !pl-9" placeholder="Search vehicle, customer, #id" value={q} onChange={(e) => reset(setQ)(e.target.value)} aria-label="Search" />
          </div>
        )}
        {initialStatus === '' && (
          <select className="input !w-auto" value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        {searchable && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <input type="date" className="input !w-auto !py-2" value={from} onChange={(e) => reset(setFrom)(e.target.value)} aria-label="From date" />–
            <input type="date" className="input !w-auto !py-2" value={to} onChange={(e) => reset(setTo)(e.target.value)} aria-label="To date" />
          </div>
        )}
      </div>
      {loading && !data ? <SkeletonRows /> : data?.items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No requests found" text="Try changing the filters, or create a new booking." action={emptyAction} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">#</th><th className="th">Vehicle</th>{showCustomer && <th className="th">Customer</th>}
                <th className="th">Services</th><th className="th">Appointment</th><th className="th">Status</th><th className="th text-right"> </th>
              </tr></thead>
              <tbody className={cx('divide-y divide-line transition', loading && 'opacity-60')}>
                {data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/60">
                    <td className="td font-semibold">#{r.id}</td>
                    <td className="td"><span className="font-medium">{r.vehicle.make} {r.vehicle.model}</span><br /><span className="font-mono text-xs text-muted">{r.vehicle.registration_number}</span></td>
                    {showCustomer && <td className="td">{r.customer.name}<br /><span className="text-xs text-muted">{r.customer.contact}</span></td>}
                    <td className="td max-w-[220px]"><span className="line-clamp-2 text-xs text-muted">{r.services.map((s) => s.name).join(', ')}</span></td>
                    <td className="td whitespace-nowrap">{fmtDate(r.slot.date)}<br /><span className="text-xs text-muted">{r.slot.start_time}</span></td>
                    <td className="td"><StatusBadge status={r.status} />{r.invoice && <div className="mt-1"><StatusBadge status={r.invoice.status} dot={false} /></div>}</td>
                    <td className="td text-right whitespace-nowrap">
                      {actions?.(r)}
                      <Link to={detailPath(r)} className="btn-secondary btn-sm ml-1">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  )
}
