import { useState } from 'react'
import { useAsync, useDebounced } from '../../lib/hooks'
import { admin } from '../../api'
import { Search, Users } from 'lucide-react'
import { EmptyState, Pagination, SkeletonRows, cx } from '../../components/ui'
import { fmtDate } from '../../lib/format'

export default function AdminCustomers() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  const { data, loading } = useAsync(() => admin.customers({ q: dq || undefined, page, per_page: 20 }), [dq, page])

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto font-semibold">Customers</h2>
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
          <input className="input !pl-9" placeholder="Search name, email, contact..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search customers" />
        </div>
      </div>
      {loading && !data ? <SkeletonRows /> : data?.items.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" text="Try a different search query." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Name</th>
                <th className="th">Contact</th>
                <th className="th">Email</th>
                <th className="th">Joined</th>
              </tr></thead>
              <tbody className={cx('divide-y divide-line transition', loading && 'opacity-60')}>
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2/60">
                    <td className="td font-semibold">{c.name}</td>
                    <td className="td">{c.contact}</td>
                    <td className="td text-muted">{c.email}</td>
                    <td className="td">{fmtDate(c.created_at)}</td>
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
