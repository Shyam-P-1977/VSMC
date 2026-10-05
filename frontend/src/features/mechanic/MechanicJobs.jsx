import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Play, Pause, Wrench, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import * as api from '../../api'
import { useAsync } from '../../lib/hooks'
import { apiError } from '../../api/client'
import { PageHeader, StatusBadge, Button, EmptyState } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import toast from 'react-hot-toast'

function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return
    const start = new Date(startTime).getTime()
    const update = () => setElapsed(Math.max(0, Date.now() - start))
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [startTime])

  const h = Math.floor(elapsed / 3600000)
  const m = Math.floor((elapsed % 3600000) / 60000)
  const s = Math.floor((elapsed % 60000) / 1000)
  
  return (
    <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-ink flex items-center justify-center bg-surface-2 p-6 rounded-2xl border border-line shadow-inner">
      <span>{h.toString().padStart(2, '0')}</span>
      <span className="text-muted animate-pulse mx-1">:</span>
      <span>{m.toString().padStart(2, '0')}</span>
      <span className="text-muted animate-pulse mx-1">:</span>
      <span>{s.toString().padStart(2, '0')}</span>
    </div>
  )
}

export default function MechanicJobs() {
  const { data, loading, error, execute } = useAsync(() => api.requests.list({ status: 'Assigned,In Progress,Awaiting Parts', per_page: 50 }), [])
  
  const handleStatusChange = async (id, status) => {
    try {
      await api.requests.status(id, status)
      toast.success(`Job marked as ${status}`)
      execute()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading jobs...</div>
  if (error) return <div className="p-8 text-center text-red-500">Failed to load jobs: {error.message}</div>

  const jobs = data?.items || []
  const activeJob = jobs.find(j => j.status === 'In Progress' || j.status === 'Awaiting Parts')
  const upcomingJobs = jobs.filter(j => j.id !== activeJob?.id)

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <PageHeader title="My Workspace" description="Manage your assigned jobs and track time." />

      {activeJob ? (
        <section className="card p-6 border-l-4 border-l-brand-500">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={activeJob.status} />
                <span className="text-sm font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">CURRENT JOB</span>
              </div>
              <h2 className="text-2xl font-bold text-ink">{activeJob.vehicle.make} {activeJob.vehicle.model}</h2>
              <p className="font-mono text-sm text-muted mt-1">{activeJob.vehicle.registration_number}</p>
              <p className="text-sm text-ink mt-3">
                <span className="font-semibold">Services:</span> {activeJob.services.map(s => s.name).join(', ')}
              </p>
              {activeJob.problem_description && (
                <div className="mt-3 p-3 bg-red-500/10 text-red-700 text-sm rounded-lg border border-red-500/20">
                  <span className="font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4"/> Customer Notes:</span>
                  <p className="mt-1">{activeJob.problem_description}</p>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-64 space-y-4">
              <Timer startTime={activeJob.updated_at || activeJob.created_at} />
              
              <div className="grid grid-cols-2 gap-2">
                <Link to={`/mechanic/jobs/${activeJob.id}`} className="btn-primary w-full text-center py-2 text-sm !rounded-xl">Update Job</Link>
                {activeJob.status === 'In Progress' ? (
                  <Button variant="outline" className="w-full text-xs !rounded-xl" onClick={() => handleStatusChange(activeJob.id, 'Awaiting Parts')}>Pause (Wait Parts)</Button>
                ) : (
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xs !rounded-xl" onClick={() => handleStatusChange(activeJob.id, 'In Progress')}>Resume Job</Button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState 
          icon={CheckCircle2} 
          title="No active job" 
          text="You don't have any job currently in progress. Start one from your queue." 
        />
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h3 className="font-semibold text-ink">Assigned Queue ({upcomingJobs.length})</h3>
        </div>
        {upcomingJobs.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">No upcoming jobs assigned to you.</div>
        ) : (
          <ul className="divide-y divide-line">
            {upcomingJobs.map((j) => (
              <li key={j.id} className="p-4 sm:px-6 hover:bg-surface-2 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-ink">{j.vehicle.make} {j.vehicle.model}</p>
                    <span className="font-mono text-xs text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-line">{j.vehicle.registration_number}</span>
                  </div>
                  <p className="text-sm text-muted mt-1 line-clamp-1">{j.services.map(s => s.name).join(', ')}</p>
                  <div className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {fmtDate(j.slot.date)} @ {j.slot.start_time}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="text-xs" onClick={() => handleStatusChange(j.id, 'In Progress')} disabled={!!activeJob}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Start
                  </Button>
                  <Link to={`/mechanic/jobs/${j.id}`} className="btn-ghost !p-2 border border-transparent hover:border-line"><ArrowRight className="h-4 w-4 text-muted"/></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
