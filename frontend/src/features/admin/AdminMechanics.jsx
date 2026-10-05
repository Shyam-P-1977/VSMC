import { useState } from 'react'
import { useAsync, useDebounced } from '../../lib/hooks'
import { admin } from '../../api'
import { apiError } from '../../api/client'
import { Plus, Search, Wrench } from 'lucide-react'
import { Button, EmptyState, Input, Modal, Pagination, SkeletonRows, cx } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminMechanics() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [key, setKey] = useState(0)
  const dq = useDebounced(q)
  const { data, loading } = useAsync(() => admin.mechanics({ q: dq || undefined, page, per_page: 20 }), [dq, page, key])
  
  const [addModal, setAddModal] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setBusy(true)
    const fd = new FormData(e.target)
    try {
      await admin.createMechanic(Object.fromEntries(fd))
      toast.success('Mechanic created successfully')
      setAddModal(false)
      setKey(k => k + 1)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto font-semibold">Mechanics</h2>
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
          <input className="input !pl-9" placeholder="Search name, specialization..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search mechanics" />
        </div>
        <Button onClick={() => setAddModal(true)} icon={Plus}>Add Mechanic</Button>
      </div>
      {loading && !data ? <SkeletonRows /> : data?.items.length === 0 ? (
        <EmptyState icon={Wrench} title="No mechanics found" text="Try a different search query or add a new mechanic." action={<Button onClick={() => setAddModal(true)} icon={Plus}>Add Mechanic</Button>} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Name</th>
                <th className="th">Contact</th>
                <th className="th">Specialization</th>
                <th className="th">Status</th>
              </tr></thead>
              <tbody className={cx('divide-y divide-line transition', loading && 'opacity-60')}>
                {data.items.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/60">
                    <td className="td font-semibold">{m.name}<br /><span className="text-xs font-normal text-muted">{m.email}</span></td>
                    <td className="td">{m.contact}</td>
                    <td className="td">{m.specialization || 'General'}</td>
                    <td className="td">{m.is_available ? <span className="badge bg-emerald-500/15 text-emerald-700">Available</span> : <span className="badge bg-amber-500/15 text-amber-700">Busy</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Mechanic">
        <form id="add-mechanic-form" onSubmit={handleAdd} className="space-y-4">
          <Input label="Full Name" name="name" required />
          <Input label="Email" type="email" name="email" required />
          <Input label="Contact Number" name="contact" required pattern="[0-9]{10}" title="10 digit phone number" />
          <Input label="Password" type="password" name="password" required minLength={6} />
          <Input label="Specialization (Optional)" name="specialization" />
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
          <Button type="submit" form="add-mechanic-form" loading={busy}>Add Mechanic</Button>
        </div>
      </Modal>
    </div>
  )
}
