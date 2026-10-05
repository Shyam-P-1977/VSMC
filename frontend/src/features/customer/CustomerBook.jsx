import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsync } from '../../lib/hooks'
import { catalog, slots, vehicles, requests } from '../../api'
import { apiError } from '../../api/client'
import { Calendar, Car, Wrench, CheckCircle2 } from 'lucide-react'
import { Button, Card, cx } from '../../components/ui'
import { inr } from '../../lib/format'
import toast from 'react-hot-toast'
import ProblemDescriptionStep from './ProblemDescriptionStep'

export default function CustomerBook() {
  const navigate = useNavigate()
  const { data: myVehicles } = useAsync(() => vehicles.list(), [])
  const { data: services } = useAsync(() => catalog.list(false), [])

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const { data: availableSlots } = useAsync(() => slots.list(date), [date])

  const [step, setStep] = useState(1)
  const [vid, setVid] = useState('')
  const [sids, setSids] = useState([])
  const [sid, setSid] = useState('') // slot id
  const [problem, setProblem] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)

  const handleNext = () => {
    if (step === 1 && !vid) return toast.error('Please select a vehicle')
    if (step === 2 && sids.length === 0) return toast.error('Please select at least one service')
    if (step === 3 && !sid) return toast.error('Please select a time slot')
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    if (!problem.trim()) return toast.error('Please describe the problem')
    setBusy(true)
    try {
      const req = await requests.book({ vehicle_id: vid, service_ids: sids, slot_id: sid, problem_description: problem })
      
      // Upload attachments sequentially
      for (const file of files) {
        try {
          await requests.uploadAttachment(req.id, file)
        } catch (uploadErr) {
          console.error("Upload failed", uploadErr)
          toast.error(`Failed to upload ${file.name}`)
        }
      }
      
      toast.success('Service booked successfully')
      navigate(`/customer/bookings/${req.id}`)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Book a Service</h1>
        <p className="text-muted mt-1">Follow the steps to schedule your vehicle service.</p>
      </div>

      <div className="flex justify-between border-b border-line pb-4 text-sm font-medium mb-6">
        {['Vehicle', 'Services', 'Date & Time', 'Details'].map((label, i) => (
          <div key={label} className={cx('flex flex-col items-center gap-2', step === i + 1 ? 'text-brand-500' : step > i + 1 ? 'text-emerald-500' : 'text-muted')}>
            <div className={cx('grid h-8 w-8 place-items-center rounded-full border-2 transition-colors', step === i + 1 ? 'border-brand-500 bg-brand-50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : step > i + 1 ? 'border-emerald-500 bg-emerald-50' : 'border-line bg-surface-2')}>
              {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-ink"><Car className="h-5 w-5 text-brand-500" /> Select Vehicle</h3>
            {myVehicles?.items?.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface-2 p-6 text-center">
                <p className="text-muted">You haven't added any vehicles yet.</p>
                <Button className="mt-4" onClick={() => navigate('/customer/vehicles')}>Add a Vehicle</Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {myVehicles?.items?.map(v => (
                  <button key={v.id} onClick={() => setVid(v.id)} className={cx('flex flex-col items-start rounded-xl border p-4 text-left transition', vid === v.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-sm' : 'border-line hover:border-brand-500/50 hover:bg-surface-2')}>
                    <span className="font-semibold text-ink">{v.make} {v.model}</span>
                    <span className="text-sm text-muted bg-surface-2 mt-1 px-1.5 py-0.5 rounded border border-line">{v.registration_number}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end"><Button onClick={handleNext} disabled={!vid}>Next Step</Button></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-ink"><Wrench className="h-5 w-5 text-brand-500" /> Select Services</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {services?.items?.map(s => {
                const isSel = sids.includes(s.id)
                return (
                  <button key={s.id} onClick={() => setSids(prev => isSel ? prev.filter(id => id !== s.id) : [...prev, s.id])} className={cx('flex flex-col items-start rounded-xl border p-4 text-left transition', isSel ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-sm' : 'border-line hover:border-brand-500/50 hover:bg-surface-2')}>
                    <div className="flex w-full justify-between"><span className="font-semibold text-ink">{s.name}</span><span className="font-semibold text-brand-600">{inr(s.base_price)}</span></div>
                    <span className="text-xs text-muted line-clamp-2 mt-1">{s.description}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleNext} disabled={sids.length === 0}>Next Step</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-ink"><Calendar className="h-5 w-5 text-brand-500" /> Choose Date & Time</h3>
            <input type="date" className="input max-w-xs" value={date} onChange={(e) => { setDate(e.target.value); setSid('') }} min={new Date().toISOString().split('T')[0]} />
            
            <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
              {availableSlots?.items?.length === 0 ? (
                <div className="col-span-full py-4 text-center text-muted border border-dashed border-line rounded-xl bg-surface-2">No slots available on this date.</div>
              ) : (
                availableSlots?.items?.map(s => {
                  const isAvailable = s.is_available
                  const isSel = sid === s.id
                  return (
                    <button key={s.id} disabled={!isAvailable} onClick={() => setSid(s.id)} className={cx('rounded-xl border p-3 text-center transition', !isAvailable ? 'border-line bg-surface-2 opacity-50 cursor-not-allowed' : isSel ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-sm' : 'border-line hover:border-brand-500/50 hover:bg-surface-2')}>
                      <span className="block font-semibold text-ink">{s.start_time}</span>
                      <span className="text-xs text-muted">{isAvailable ? `${s.available} spots left` : 'Full'}</span>
                    </button>
                  )
                })
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleNext} disabled={!sid}>Next Step</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <ProblemDescriptionStep 
            problem={problem}
            setProblem={setProblem}
            files={files}
            setFiles={setFiles}
            onBack={() => setStep(3)}
            onConfirm={handleSubmit}
            busy={busy}
          />
        )}
      </Card>
    </div>
  )
}
