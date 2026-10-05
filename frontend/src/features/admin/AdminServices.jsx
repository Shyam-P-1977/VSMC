import { useState } from 'react'
import { useAsync } from '../../lib/hooks'
import { catalog } from '../../api'
import { apiError } from '../../api/client'
import { Plus, Tag } from 'lucide-react'
import { Button, EmptyState, Input, Modal, SkeletonRows, cx } from '../../components/ui'
import { inr } from '../../lib/format'
import toast from 'react-hot-toast'

export default function AdminServices() {
  const [key, setKey] = useState(0)
  const { data, loading } = useAsync(() => catalog.list(true), [key])
  
  const [modalMode, setModalMode] = useState(null) // 'add' or service object
  const [busy, setBusy] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    const fd = new FormData(e.target)
    const body = {
      name: fd.get('name'),
      description: fd.get('description'),
      base_price: parseFloat(fd.get('base_price')),
      estimated_hours: parseFloat(fd.get('estimated_hours'))
    }
    
    try {
      if (modalMode === 'add') {
        await catalog.create(body)
        toast.success('Service created')
      } else {
        await catalog.update(modalMode.id, body)
        toast.success('Service updated')
      }
      setModalMode(null)
      setKey(k => k + 1)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this service?')) return
    try {
      await catalog.remove(id)
      toast.success('Service removed')
      setKey(k => k + 1)
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  const handleToggleActive = async (service) => {
    try {
      await catalog.update(service.id, { is_active: !service.is_active })
      setKey(k => k + 1)
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto font-semibold">Service Catalog</h2>
        <Button onClick={() => setModalMode('add')} icon={Plus}>Add Service</Button>
      </div>
      {loading && !data ? <SkeletonRows /> : data?.items?.length === 0 ? (
        <EmptyState icon={Tag} title="No services found" text="Add services to your catalog." action={<Button onClick={() => setModalMode('add')} icon={Plus}>Add Service</Button>} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="th">Name</th>
              <th className="th">Base Price</th>
              <th className="th">Est. Hours</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr></thead>
            <tbody className={cx('divide-y divide-line transition', loading && 'opacity-60')}>
              {data?.items?.map((s) => (
                <tr key={s.id} className={cx("hover:bg-surface-2/60", !s.is_active && "opacity-60")}>
                  <td className="td font-semibold">{s.name}<br /><span className="text-xs font-normal text-muted max-w-xs truncate block">{s.description}</span></td>
                  <td className="td">{inr(s.base_price)}</td>
                  <td className="td">{s.estimated_hours}h</td>
                  <td className="td">
                    <button onClick={() => handleToggleActive(s)} className={cx("badge", s.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-700")}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="td text-right">
                    <button className="btn-secondary btn-sm mr-2" onClick={() => setModalMode(s)}>Edit</button>
                    <button className="btn-secondary btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => handleRemove(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === 'add' ? 'Add Service' : 'Edit Service'}>
        <form id="service-form" onSubmit={handleSave} className="space-y-4">
          <Input label="Service Name" name="name" required defaultValue={modalMode !== 'add' ? modalMode?.name : ''} />
          <Input label="Description" name="description" as="textarea" rows={3} required defaultValue={modalMode !== 'add' ? modalMode?.description : ''} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Base Price (₹)" type="number" step="0.01" name="base_price" required defaultValue={modalMode !== 'add' ? modalMode?.base_price : ''} />
            <Input label="Estimated Hours" type="number" step="0.5" name="estimated_hours" required defaultValue={modalMode !== 'add' ? modalMode?.estimated_hours : ''} />
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalMode(null)}>Cancel</Button>
          <Button type="submit" form="service-form" loading={busy}>{modalMode === 'add' ? 'Add Service' : 'Save Changes'}</Button>
        </div>
      </Modal>
    </div>
  )
}
