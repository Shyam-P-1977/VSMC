import { useState } from 'react'
import { UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../api'
import { apiError } from '../api/client'
import { useAsync } from '../lib/hooks'
import { Button, EmptyState, Modal, Skeleton, cx } from './ui'

export default function AssignModal({ request, open, onClose, onDone }) {
  const { data, loading } = useAsync(() => (open ? api.admin.availableMechanics() : Promise.resolve(null)), [open])
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(false)
  const list = data?.items || []

  const assign = async () => {
    setBusy(true)
    try {
      await api.requests.assign(request.id, sel)
      toast.success('Mechanic assigned. Mechanic and customer notified.')
      setSel(null)
      onDone?.()
      onClose()
    } catch (e) { toast.error(apiError(e)) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Assign mechanic · Request #${request?.id}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={assign} loading={busy} disabled={!sel}>Assign mechanic</Button></>}>
      {request && (
        <div className="mb-4 rounded-xl bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{request.vehicle.make} {request.vehicle.model} · {request.vehicle.registration_number}</p>
          <p className="text-muted">{request.customer.name} · {request.customer.contact}</p>
          <p className="mt-1 text-muted">{request.services.map((s) => s.name).join(', ')}</p>
        </div>
      )}
      {loading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        : list.length === 0 ? <EmptyState icon={UserX} title="No mechanic available" text="All mechanics are busy right now. Free one up by completing a job or toggling availability on the Mechanics page." />
          : (
            <div className="space-y-2" role="radiogroup" aria-label="Available mechanics">
              {list.map((m) => (
                <button key={m.id} role="radio" aria-checked={sel === m.id} onClick={() => setSel(m.id)}
                  className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', sel === m.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/30' : 'border-line hover:border-brand-500/60')}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white">{m.name[0]}</span>
                  <span className="flex-1"><span className="block font-semibold">{m.name}</span><span className="text-xs text-muted">{m.specialization || 'General'} · {m.completed_jobs} jobs done</span></span>
                  <span className="badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Available</span>
                </button>
              ))}
            </div>
          )}
    </Modal>
  )
}
