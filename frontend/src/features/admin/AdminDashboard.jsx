import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../../lib/hooks'
import * as api from '../../api'
import { Card, PageHeader, cx, StatusBadge, Button, Avatar } from '../../components/ui'
import { Users, ClipboardList, Package, Wrench, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { fmtDate, inr } from '../../lib/format'
import toast from 'react-hot-toast'

const COLORS = ['#22d3ee', '#818cf8', '#34d399', '#fbbf24', '#f87171']

export default function AdminDashboard() {
  const { data: stats, loading, error } = useAsync(api.admin.dashboard, [])
  const { data: revenueData } = useAsync(() => api.reports.get('revenue'), [])
  const { data: bookingsData } = useAsync(() => api.reports.get('bookings'), [])
  const { data: lowStock } = useAsync(api.parts.lowStock, [])
  const { data: pendingReqs, execute: reloadReqs } = useAsync(() => api.requests.list({ status: 'Pending', per_page: 5 }), [])
  const { data: mechanics } = useAsync(api.admin.availableMechanics, [])

  const [assigning, setAssigning] = useState(null)

  const handleAssign = async (reqId, mechId) => {
    if (!mechId) return
    setAssigning(reqId)
    try {
      await api.requests.assign(reqId, mechId)
      toast.success('Assigned successfully')
      reloadReqs()
    } catch (err) {
      toast.error(err.message || 'Failed to assign')
    } finally {
      setAssigning(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>
  if (error) return <div className="p-8 text-center text-red-500">Failed to load stats: {error.message}</div>

  const STATS = [
    { label: 'Total Customers', value: stats?.customers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Mechanics', value: stats?.mechanics || 0, icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Pending Requests', value: stats?.pending_requests || 0, icon: ClipboardList, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'Active Jobs', value: stats?.active_jobs || 0, icon: ClipboardList, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Low Stock Parts', value: stats?.low_stock_parts || 0, icon: Package, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Revenue (MTD)', value: inr(stats?.revenue_mtd || 0), icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ]

  const revDaily = revenueData?.charts?.daily || []
  const bkStatus = bookingsData?.charts?.by_status || []
  const bkServices = bookingsData?.charts?.by_service || []

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Admin Dashboard" description="Overview of the service center operations." />
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STATS.map((s, i) => (
          <div key={i} className="card p-4 flex flex-col justify-between hover:-translate-y-1 transition-transform">
            <div className="flex items-start justify-between">
              <div className={cx('flex h-10 w-10 items-center justify-center rounded-xl', s.bg, s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs font-medium text-muted mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-ink">Revenue Trend (30 Days)</h2>
            <Link to="/admin/reports" className="text-xs font-medium text-brand-600 hover:underline">View report</Link>
          </div>
          <div className="h-72">
            {revDaily.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => v.substring(5)} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => '₹'+v} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => [inr(val), 'Revenue']} />
                  <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted text-sm">No revenue data available</div>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-ink mb-6">Bookings by Status</h2>
          <div className="h-64">
            {bkStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bkStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {bkStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted text-sm">No booking data available</div>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {bkStatus.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate text-muted">{s.name}</span>
                <span className="font-medium ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-semibold text-ink">Recent Pending Requests</h2>
            <Link to="/admin/requests" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            {pendingReqs?.items?.length ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-2 text-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date & Time</th>
                    <th className="px-6 py-3 font-medium">Customer & Vehicle</th>
                    <th className="px-6 py-3 font-medium">Services</th>
                    <th className="px-6 py-3 font-medium text-right">Assign Mechanic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pendingReqs.items.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink">{fmtDate(r.slot.date)}</div>
                        <div className="text-xs text-muted">{r.slot.start_time}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink">{r.customer.name}</div>
                        <div className="text-xs text-muted">{r.vehicle.make} {r.vehicle.model} ({r.vehicle.registration_number})</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[150px] truncate text-muted" title={r.services.map(s=>s.name).join(', ')}>
                          {r.services.map(s => s.name).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          className="input !py-1.5 !text-xs !w-40 mr-2"
                          onChange={(e) => handleAssign(r.id, e.target.value)}
                          value=""
                          disabled={assigning === r.id}
                        >
                          <option value="" disabled>{assigning === r.id ? 'Assigning...' : 'Select Mechanic'}</option>
                          {mechanics?.map(m => (
                            <option key={m.id} value={m.id}>{m.user.name} ({m.active_jobs} jobs)</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-sm text-muted">No pending requests to assign. 🎉</div>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-red-500/5">
            <h2 className="font-semibold text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Low Stock Alerts</h2>
            <Link to="/admin/inventory" className="text-xs font-medium text-red-600 hover:underline">Manage</Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {lowStock?.length ? (
              <ul className="divide-y divide-line">
                {lowStock.map(p => (
                  <li key={p.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-ink">{p.name}</p>
                      <p className="text-xs text-muted">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{p.quantity_in_stock} left</p>
                      <p className="text-[10px] text-muted uppercase">Min: {p.min_threshold}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center text-sm text-muted">Inventory levels are healthy.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
