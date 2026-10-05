import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Edit3, Fuel, History, Palette, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api'
import { apiError, apiFieldErrors } from '../../api/client'
import { useAsync } from '../../lib/hooks'
import { isReg, normalizeReg, req, validate } from '../../lib/validators'
import { Button, EmptyState, Input, Modal, PageHeader, Select, SkeletonCards } from '../../components/ui'

const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']
const EMPTY = { registration_number: '', make: '', model: '', year: new Date().getFullYear(), fuel_type: '', color: '' }

export function VehicleForm({ open, vehicle, onClose, onSaved }) {
  const [f, setF] = useState(vehicle || EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [lastKey, setLastKey] = useState(null)
  const key = open ? (vehicle?.id ?? 'new') : null
  if (key !== lastKey) { setLastKey(key); if (open) { setF(vehicle ? { ...EMPTY, ...vehicle, fuel_type: vehicle.fuel_type || '', color: vehicle.color || '' } : EMPTY); setErrors({}) } }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(f, {
      registration_number: (v) => (!v?.trim() ? 'Registration number is required' : isReg(v) ? '' : 'Enter a valid number, e.g. MH12AB1234'),
      make: req('Make'), model: req('Model'),
      year: (v) => (!(Number(v) >= 1980 && Number(v) <= new Date().getFullYear() + 1) ? `Year must be between 1980 and ${new Date().getFullYear() + 1}` : ''),
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const body = { ...f, registration_number: normalizeReg(f.registration_number), year: Number(f.year), fuel_type: f.fuel_type || null, color: f.color || null }
    try {
      const saved = vehicle ? await api.vehicles.update(vehicle.id, body) : await api.vehicles.create(body)
      toast.success(vehicle ? 'Vehicle updated' : 'Vehicle added')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      const fe = apiFieldErrors(err)
      setErrors(fe)
      if (!Object.keys(fe).length) toast.error(apiError(err))
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={vehicle ? 'Edit vehicle' : 'Add a vehicle'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="vehicle-form" type="submit" loading={busy}>{vehicle ? 'Save changes' : 'Add vehicle'}</Button></>}>
      <form id="vehicle-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input id="veh-reg" label="Registration number" required placeholder="MH12AB1234" value={f.registration_number} onChange={set('registration_number')} error={errors.registration_number} hint="Spaces and hyphens are ignored" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="veh-make" label="Make" required placeholder="Maruti Suzuki" value={f.make} onChange={set('make')} error={errors.make} />
          <Input id="veh-model" label="Model" required placeholder="Swift" value={f.model} onChange={set('model')} error={errors.model} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input id="veh-year" label="Year" required type="number" value={f.year} onChange={set('year')} error={errors.year} />
          <Select id="veh-fuel" label="Fuel" value={f.fuel_type} onChange={set('fuel_type')} error={errors.fuel_type}><option value="">Select</option>{FUELS.map((x) => <option key={x}>{x}</option>)}</Select>
          <Input id="veh-color" label="Color" value={f.color} onChange={set('color')} />
        </div>
      </form>
    </Modal>
  )
}

export default function Vehicles() {
  const { data, loading, reload } = useAsync(() => api.vehicles.list(), [])
  const [editing, setEditing] = useState(undefined) // undefined=closed, null=new, obj=edit

  return (
    <>
      <PageHeader title="My Vehicles" subtitle="Register your cars once and book services in seconds."
        actions={<Button id="add-vehicle" onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Add vehicle</Button>} />
      {loading && !data ? <SkeletonCards n={3} className="h-44" /> : data?.items.length === 0 ? (
        <div className="card"><EmptyState icon={Car} title="No vehicles yet" text="Add your first vehicle to start booking services." action={<Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Add your first vehicle</Button>} /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((v) => (
            <div key={v.id} className="card card-hover relative overflow-hidden p-5">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/10" />
              <div className="relative flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md"><Car className="h-6 w-6" /></div>
                <button onClick={() => setEditing(v)} className="btn-ghost btn-sm" aria-label={`Edit ${v.registration_number}`}><Edit3 className="h-4 w-4" />Edit</button>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{v.make} {v.model}</h3>
              <p className="mt-1 inline-block rounded-md border-2 border-ink/80 bg-amber-100 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-slate-900">{v.registration_number}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{v.year}</span>{v.fuel_type && <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{v.fuel_type}</span>}{v.color && <span className="flex items-center gap-1"><Palette className="h-3 w-3" />{v.color}</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <Link to="/customer/book" state={{ vehicleId: v.id }} className="btn-primary btn-sm flex-1">Book service</Link>
                <Link to="/customer/history" state={{ vehicleId: v.id }} className="btn-secondary btn-sm"><History className="h-3.5 w-3.5" />History</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <VehicleForm open={editing !== undefined} vehicle={editing || null} onClose={() => setEditing(undefined)} onSaved={reload} />
    </>
  )
}
