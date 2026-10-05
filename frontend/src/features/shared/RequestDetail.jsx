import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Car, FileText, Phone, Trash2, User, Wrench, XCircle, UserPlus, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api'
import { apiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../lib/hooks'
import { fmtDate, fmtDateTime, inr } from '../../lib/format'
import AssignModal from '../../components/AssignModal'
import PaymentModal from '../../components/PaymentModal'
import { Button, ConfirmDialog, ErrorState, PageHeader, Skeleton, StatusBadge, Timeline } from '../../components/ui'

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><div className="text-sm font-medium">{children}</div></div>
    </div>
  )
}

export default function RequestDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const { data: r, loading, error, reload } = useAsync(() => api.requests.get(id), [id])
  const [assignOpen, setAssignOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const base = `/${user.role}`

  // live status: poll every 15s
  useEffect(() => {
    const t = setInterval(() => reload(), 15000)
    return () => clearInterval(t)
  }, [reload])

  if (error && !r) return <ErrorState message={error} onRetry={reload} />
  if (!r) return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>

  const canCancel = ['Pending', 'Assigned'].includes(r.status)
  const doCancel = async () => {
    setBusy(true)
    try { await api.requests.cancel(r.id); toast.success('Request cancelled'); setConfirm(null); reload() }
    catch (e) { toast.error(apiError(e)) } finally { setBusy(false) }
  }
  const doDelete = async () => {
    setBusy(true)
    try { await api.requests.remove(r.id); toast.success('Request deleted'); nav(`${base}/bookings`) }
    catch (e) { toast.error(apiError(e)); setConfirm(null) } finally { setBusy(false) }
  }

  const partsTotal = r.parts_used.reduce((s, p) => s + p.line_total, 0)
  const labourTotal = r.labour.reduce((s, l) => s + l.line_total, 0)

  return (
    <>
      <Link to={`${base}/bookings`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand-600"><ArrowLeft className="h-4 w-4" />Back to bookings</Link>
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">Request #{r.id} <StatusBadge status={r.status} /></span>}
        subtitle={`Booked on ${fmtDateTime(r.created_at)}`}
        actions={<>
          {user.role === 'admin' && ['Pending', 'Assigned'].includes(r.status) && <Button onClick={() => setAssignOpen(true)}><UserPlus className="h-4 w-4" />{r.mechanic ? 'Reassign' : 'Assign mechanic'}</Button>}
          {canCancel && <Button variant="secondary" onClick={() => setConfirm('cancel')}><XCircle className="h-4 w-4" />Cancel booking</Button>}
          {user.role === 'admin' && <Button variant="ghost" onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
        </>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card grid gap-5 p-6 sm:grid-cols-2">
            <Info icon={Car} label="Vehicle">{r.vehicle.make} {r.vehicle.model} ({r.vehicle.year})<br /><span className="font-mono text-xs text-muted">{r.vehicle.registration_number}</span></Info>
            <Info icon={CalendarClock} label="Appointment">{fmtDate(r.slot.date)}<br /><span className="text-xs text-muted">{r.slot.start_time} – {r.slot.end_time}</span></Info>
            {user.role !== 'customer' && <Info icon={User} label="Customer">{r.customer.name}<br /><span className="text-xs text-muted">{r.customer.contact}</span></Info>}
            <Info icon={Wrench} label="Mechanic">{r.mechanic ? <>{r.mechanic.name}<br /><span className="text-xs text-muted">{r.mechanic.contact}</span></> : <span className="text-muted">Not assigned yet</span>}</Info>
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Services requested</p>
              <div className="flex flex-wrap gap-2">{r.services.map((s) => <span key={s.id} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">{s.name} · {inr(s.base_price)}</span>)}</div>
              <p className="mt-2 text-xs text-muted">Indicative estimate: {inr(r.estimated_total)} (final bill = labour + parts + GST)</p>
            </div>
            <div className="sm:col-span-2"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Problem description</p><p className="text-sm">{r.problem_description}</p></div>
            
            {r.attachments && r.attachments.length > 0 && (
              <div className="sm:col-span-2 mt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Attachments</p>
                <div className="flex flex-wrap gap-4">
                  {r.attachments.map(att => (
                    <a key={att.id} href={`http://localhost:5000${att.file_path}`} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-line h-24 w-24">
                      {att.file_type.startsWith('image/') ? (
                        <img src={`http://localhost:5000${att.file_path}`} alt={att.file_name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-2">
                          <FileText className="h-8 w-8 text-muted" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(r.labour.length > 0 || r.parts_used.length > 0) && (
            <div className="card overflow-hidden">
              <h2 className="border-b border-line px-6 py-4 font-semibold">Work done</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th className="th">Item</th><th className="th text-right">Qty / Hours</th><th className="th text-right">Rate</th><th className="th text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.labour.map((l) => <tr key={'l' + l.id}><td className="td">{l.description}{l.repair_notes && <p className="text-xs text-muted">{l.repair_notes}</p>}</td><td className="td text-right">{l.hours} h</td><td className="td text-right">{inr(l.rate_per_hour)}</td><td className="td text-right font-medium">{inr(l.line_total)}</td></tr>)}
                    {r.parts_used.map((p) => <tr key={'p' + p.id}><td className="td">{p.name}</td><td className="td text-right">{p.quantity}</td><td className="td text-right">{inr(p.unit_price)}</td><td className="td text-right font-medium">{inr(p.line_total)}</td></tr>)}
                  </tbody>
                  <tfoot><tr className="bg-surface-2/60"><td className="td font-semibold" colSpan={3}>Subtotal (before GST)</td><td className="td text-right font-bold">{inr(labourTotal + partsTotal)}</td></tr></tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-5 font-semibold">Live status</h2>
            <Timeline items={r.timeline} />
          </div>
          {r.invoice && (
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Invoice</h2><StatusBadge status={r.invoice.status} /></div>
              <p className="font-mono text-sm text-muted">{r.invoice.invoice_number}</p>
              <p className="my-2 font-display text-3xl font-bold">{inr(r.invoice.payable_total || r.invoice.total_amount)}</p>
              <div className="space-y-2">
                {user.role === 'customer' && r.invoice.status === 'Unpaid' && (
                  <Button onClick={() => setPayOpen(true)} className="w-full"><CreditCard className="h-4 w-4" />Pay Now</Button>
                )}
                <Button variant={r.invoice.status === 'Unpaid' && user.role === 'customer' ? 'secondary' : 'primary'}
                  onClick={async () => {
                    try {
                      const html = await api.invoices.html(r.invoice.id)
                      const w = window.open('', '_blank')
                      w.document.write(html)
                      w.document.close()
                    } catch (err) { toast.error('Failed to load invoice') }
                  }} 
                  className="w-full"
                >
                  <FileText className="h-4 w-4" />View invoice
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AssignModal request={r} open={assignOpen} onClose={() => setAssignOpen(false)} onDone={reload} />
      {r.invoice && <PaymentModal invoice={r.invoice} open={payOpen} onClose={() => setPayOpen(false)} onDone={reload} />}
      <ConfirmDialog open={confirm === 'cancel'} title="Cancel this booking?" message="Your slot will be released. This cannot be undone." confirmText="Yes, cancel booking" danger loading={busy} onConfirm={doCancel} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'delete'} title="Delete this request?" message="This permanently deletes the request and its records. Requests with a paid invoice cannot be deleted." confirmText="Delete" danger loading={busy} onConfirm={doDelete} onClose={() => setConfirm(null)} />
    </>
  )
}
