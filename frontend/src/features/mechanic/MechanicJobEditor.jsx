import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api'
import { apiError } from '../../api/client'
import { useAsync } from '../../lib/hooks'
import { inr } from '../../lib/format'
import { Button, ErrorState, Input, Modal, PageHeader, Select, Skeleton, StatusBadge, Textarea } from '../../components/ui'

export default function MechanicJobEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: r, error, reload } = useAsync(() => api.requests.get(id), [id])
  const { data: inventory } = useAsync(() => api.parts.list({ per_page: 100 }), [])
  
  const [busy, setBusy] = useState(false)
  
  // modales
  const [partOpen, setPartOpen] = useState(false)
  const [partF, setPartF] = useState({ part_id: '', quantity: '1' })
  
  const [labourOpen, setLabourOpen] = useState(false)
  const [labourF, setLabourF] = useState({ description: '', hours: '', rate_per_hour: '', repair_notes: '' })

  const [statusOpen, setStatusOpen] = useState(false)
  const [statusF, setStatusF] = useState({ status: '', note: '', no_parts_confirmed: false })

  const handleStatus = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.requests.status(r.id, statusF.status, { note: statusF.note, no_parts_confirmed: statusF.no_parts_confirmed })
      toast.success('Status updated')
      setStatusOpen(false)
      reload()
    } catch (err) { toast.error(apiError(err)) } finally { setBusy(false) }
  }

  const handleAddPart = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.requests.addPart(r.id, Number(partF.part_id), Number(partF.quantity))
      toast.success('Part added')
      setPartOpen(false)
      reload()
    } catch (err) { toast.error(apiError(err)) } finally { setBusy(false) }
  }

  const handleAddLabour = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.requests.addLabour(r.id, { 
        description: labourF.description, 
        hours: Number(labourF.hours), 
        rate_per_hour: Number(labourF.rate_per_hour),
        repair_notes: labourF.repair_notes
      })
      toast.success('Labour added')
      setLabourOpen(false)
      reload()
    } catch (err) { toast.error(apiError(err)) } finally { setBusy(false) }
  }
  
  const handleRemovePart = async (jid) => {
    if (!window.confirm('Remove part?')) return
    try { await api.requests.removePart(r.id, jid); toast.success('Part removed'); reload() } catch (err) { toast.error(apiError(err)) }
  }

  const handleRemoveLabour = async (lid) => {
    if (!window.confirm('Remove labour?')) return
    try { await api.requests.removeLabour(r.id, lid); toast.success('Labour removed'); reload() } catch (err) { toast.error(apiError(err)) }
  }

  const handleComplete = async () => {
    if (!window.confirm('Are you sure you want to complete this job? This will generate the invoice.')) return
    setBusy(true)
    try {
      await api.requests.complete(r.id, r.parts_used.length === 0)
      toast.success('Job completed')
      nav('/mechanic/history')
    } catch (err) { toast.error(apiError(err)) } finally { setBusy(false) }
  }

  if (error && !r) return <ErrorState message={error} onRetry={reload} />
  if (!r) return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>

  const isEditable = !['Completed', 'Cancelled'].includes(r.status)
  
  return (
    <>
      <Link to="/mechanic" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand-600"><ArrowLeft className="h-4 w-4" />Back to jobs</Link>
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">Update Job #{r.id} <StatusBadge status={r.status} /></span>}
        actions={isEditable && <>
          <Button variant="secondary" onClick={() => { setStatusF({ status: r.status, note: '' }); setStatusOpen(true) }}>Change Status</Button>
          <Button onClick={handleComplete} loading={busy}><CheckCircle className="h-4 w-4" /> Complete Job</Button>
        </>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          
          <div className="card p-6">
            <h2 className="mb-4 font-semibold">Job Details</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted">Vehicle</p><p className="font-medium">{r.vehicle.make} {r.vehicle.model} ({r.vehicle.registration_number})</p></div>
              <div><p className="text-muted">Problem Description</p><p className="font-medium">{r.problem_description}</p></div>
              <div className="sm:col-span-2"><p className="text-muted">Requested Services</p><p className="font-medium">{r.services.map(s => s.name).join(', ')}</p></div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-semibold">Parts Used</h2>
              {isEditable && <Button size="sm" onClick={() => { setPartF({ part_id: '', quantity: '1' }); setPartOpen(true) }}><Plus className="h-4 w-4" /> Add Part</Button>}
            </div>
            {r.parts_used.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr><th className="th">Part</th><th className="th text-right">Qty</th><th className="th text-right">Total</th>{isEditable && <th className="th text-right"></th>}</tr></thead>
                <tbody className="divide-y divide-line">
                  {r.parts_used.map((p) => <tr key={p.id}><td className="td">{p.name}</td><td className="td text-right">{p.quantity}</td><td className="td text-right font-medium">{inr(p.line_total)}</td>{isEditable && <td className="td text-right"><button onClick={() => handleRemovePart(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>}</tr>)}
                </tbody>
              </table>
            ) : <p className="px-6 py-4 text-sm text-muted">No parts added yet.</p>}
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-semibold">Labour / Tasks</h2>
              {isEditable && <Button size="sm" onClick={() => { setLabourF({ description: '', hours: '', rate_per_hour: '', repair_notes: '' }); setLabourOpen(true) }}><Plus className="h-4 w-4" /> Add Labour</Button>}
            </div>
            {r.labour.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr><th className="th">Task</th><th className="th text-right">Hours</th><th className="th text-right">Total</th>{isEditable && <th className="th text-right"></th>}</tr></thead>
                <tbody className="divide-y divide-line">
                  {r.labour.map((l) => <tr key={l.id}><td className="td">{l.description}<br/><span className="text-xs text-muted">{l.repair_notes}</span></td><td className="td text-right">{l.hours}</td><td className="td text-right font-medium">{inr(l.line_total)}</td>{isEditable && <td className="td text-right"><button onClick={() => handleRemoveLabour(l.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>}</tr>)}
                </tbody>
              </table>
            ) : <p className="px-6 py-4 text-sm text-muted">No labour added yet.</p>}
          </div>

        </div>
      </div>

      <Modal open={partOpen} onClose={() => setPartOpen(false)} title="Add Part">
        <form id="add-part" onSubmit={handleAddPart} className="space-y-4">
          <Select label="Select Part" required value={partF.part_id} onChange={e => setPartF({...partF, part_id: e.target.value})}>
            <option value="">-- select part --</option>
            {inventory?.items.filter(p => p.quantity_in_stock > 0).map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity_in_stock}) - {inr(p.unit_price)}</option>)}
          </Select>
          <Input label="Quantity" type="number" min="1" required value={partF.quantity} onChange={e => setPartF({...partF, quantity: e.target.value})} />
        </form>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setPartOpen(false)}>Cancel</Button><Button type="submit" form="add-part" loading={busy}>Add Part</Button></div>
      </Modal>

      <Modal open={labourOpen} onClose={() => setLabourOpen(false)} title="Add Labour">
        <form id="add-labour" onSubmit={handleAddLabour} className="space-y-4">
          <Input label="Task Description" required value={labourF.description} onChange={e => setLabourF({...labourF, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hours" type="number" step="0.1" min="0" required value={labourF.hours} onChange={e => setLabourF({...labourF, hours: e.target.value})} />
            <Input label="Rate per hour" type="number" min="0" required value={labourF.rate_per_hour} onChange={e => setLabourF({...labourF, rate_per_hour: e.target.value})} />
          </div>
          <Textarea label="Repair Notes (Optional)" value={labourF.repair_notes} onChange={e => setLabourF({...labourF, repair_notes: e.target.value})} />
        </form>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setLabourOpen(false)}>Cancel</Button><Button type="submit" form="add-labour" loading={busy}>Add Labour</Button></div>
      </Modal>

      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Change Status">
        <form id="change-status" onSubmit={handleStatus} className="space-y-4">
          <Select label="Status" required value={statusF.status} onChange={e => setStatusF({...statusF, status: e.target.value})}>
            {['Assigned', 'In Progress', 'Awaiting Parts'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Textarea label="Note (Optional)" value={statusF.note} onChange={e => setStatusF({...statusF, note: e.target.value})} />
        </form>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancel</Button><Button type="submit" form="change-status" loading={busy}>Update Status</Button></div>
      </Modal>
    </>
  )
}
