import { Link } from 'react-router-dom'
import { CalendarPlus, Car, ClipboardList, Receipt, Wrench, History, ArrowRight, CreditCard } from 'lucide-react'
import * as api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../lib/hooks'
import { fmtDate, inr } from '../../lib/format'
import { EmptyState, PageHeader, SkeletonCards, StatCard, StatusBadge } from '../../components/ui'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const reqs = useAsync(() => api.requests.list({ per_page: 100 }), [])
  const inv = useAsync(() => api.invoices.list({ per_page: 100 }), [])
  const veh = useAsync(() => api.vehicles.list(), [])

  const active = (reqs.data?.items || []).filter((r) => ['Pending', 'Assigned', 'In Progress', 'Awaiting Parts'].includes(r.status))
  const unpaid = (inv.data?.items || []).filter((i) => i.status === 'Unpaid')
  const loading = (reqs.loading && !reqs.data) || (inv.loading && !inv.data)

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]} 👋`} subtitle="Here's what's happening with your vehicles." />
      {loading ? <SkeletonCards /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Wrench} label="Active jobs" value={active.length} tone="indigo" to="/customer/bookings" />
          <StatCard icon={Receipt} label="Unpaid invoices" value={unpaid.length} tone="red" to="/customer/invoices" hint={unpaid.length ? inr(unpaid.reduce((s, i) => s + i.payable_total, 0)) + ' due' : 'All clear'} />
          <StatCard icon={Car} label="My vehicles" value={veh.data?.total ?? '–'} tone="brand" to="/customer/vehicles" />
          <StatCard icon={ClipboardList} label="Total bookings" value={reqs.data?.total ?? '–'} tone="emerald" to="/customer/bookings" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4"><h2 className="font-semibold">Active jobs</h2><Link to="/customer/bookings" className="text-sm font-medium text-brand-600">View all</Link></div>
            {active.length === 0 ? <EmptyState icon={Wrench} title="No active jobs" text="Book a service and track its progress here." action={<Link to="/customer/book" className="btn-primary">Book a service</Link>} /> : (
              <ul className="divide-y divide-line">
                {active.map((r) => (
                  <li key={r.id}><Link to={`/customer/bookings/${r.id}`} className="flex items-center gap-4 px-6 py-4 transition hover:bg-surface-2">
                    <div className="min-w-0 flex-1"><p className="font-semibold">{r.vehicle.make} {r.vehicle.model} <span className="font-mono text-xs font-normal text-muted">{r.vehicle.registration_number}</span></p>
                      <p className="truncate text-xs text-muted">{r.services.map((s) => s.name).join(', ')} · {fmtDate(r.slot.date)} {r.slot.start_time}</p></div>
                    <StatusBadge status={r.status} /><ArrowRight className="h-4 w-4 text-muted" />
                  </Link></li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4"><h2 className="font-semibold">Unpaid invoices</h2><Link to="/customer/invoices" className="text-sm font-medium text-brand-600">All invoices</Link></div>
            {unpaid.length === 0 ? <p className="px-6 py-8 text-center text-sm text-muted">No pending payments. 🎉</p> : (
              <ul className="divide-y divide-line">
                {unpaid.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <div className="flex-1"><p className="font-mono text-sm font-semibold">{i.invoice_number}</p><p className="text-xs text-muted">{i.vehicle.make} {i.vehicle.model} · {i.vehicle.registration_number}</p></div>
                    <p className="font-display text-lg font-bold">{inr(i.payable_total)}</p>
                    <Link to={`/customer/pay/${i.id}`} className="btn-primary btn-sm"><CreditCard className="h-3.5 w-3.5" />Pay now</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="card h-fit p-6">
          <h2 className="mb-4 font-semibold">Quick actions</h2>
          <div className="grid gap-2">
            {[['/customer/book', 'Book a service', CalendarPlus], ['/customer/vehicles', 'Add / edit vehicles', Car], ['/customer/history', 'Service history', History], ['/customer/invoices', 'Invoices & receipts', Receipt]].map(([to, label, Icon]) => (
              <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium transition hover:border-brand-500 hover:bg-brand-50">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white"><Icon className="h-4 w-4" /></span>{label}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}
