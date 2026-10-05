import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync, useDebounced } from '../../lib/hooks'
import { invoices } from '../../api'
import { Search, Receipt } from 'lucide-react'
import { EmptyState, Pagination, SkeletonRows, StatusBadge, cx } from '../../components/ui'
import { fmtDate, inr } from '../../lib/format'

export default function CustomerInvoices() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  const { data, loading } = useAsync(() => invoices.list({ q: dq || undefined, page, per_page: 20 }), [dq, page])

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto font-semibold">My Invoices</h2>
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
          <input className="input !pl-9" placeholder="Search invoice..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search invoices" />
        </div>
      </div>
      {loading && !data ? <SkeletonRows /> : data?.items.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices found" text="You have no invoices yet." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Invoice #</th>
                <th className="th">Vehicle</th>
                <th className="th">Date</th>
                <th className="th">Amount</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr></thead>
              <tbody className={cx('divide-y divide-line transition', loading && 'opacity-60')}>
                {data.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-2/60">
                    <td className="td font-semibold"><Link to={`/customer/bookings/${inv.request_id}`} className="hover:underline">{inv.invoice_number}</Link></td>
                    <td className="td">{inv.vehicle.make} {inv.vehicle.model}<br /><span className="text-xs text-muted font-normal">{inv.vehicle.registration_number}</span></td>
                    <td className="td">{fmtDate(inv.created_at)}</td>
                    <td className="td font-medium">{inr(inv.payable_total)}</td>
                    <td className="td"><StatusBadge status={inv.status} dot={false} /></td>
                    <td className="td text-right">
                      <Link to={`/customer/bookings/${inv.request_id}`} className="btn-secondary btn-sm">View Details</Link>
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
