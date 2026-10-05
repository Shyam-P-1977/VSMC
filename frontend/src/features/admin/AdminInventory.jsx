import { useState } from 'react'
import { useAsync, useDebounced } from '../../lib/hooks'
import { parts } from '../../api'
import { apiError } from '../../api/client'
import { AlertTriangle, Package, Plus, Search } from 'lucide-react'
import { Button, EmptyState, Input, Modal, Pagination, SkeletonRows, cx } from '../../components/ui'
import { inr } from '../../lib/format'
import toast from 'react-hot-toast'

export default function AdminInventory() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [key, setKey] = useState(0)
  const dq = useDebounced(q)
  const { data, loading } = useAsync(() => parts.list({ q: dq || undefined, page, per_page: 20 }), [dq, page, key])
  
  const [modalMode, setModalMode] = useState(null) // 'add' or part object for edit
  const [busy, setBusy] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    const fd = new FormData(e.target)
    const body = {
      name: fd.get('name'),
      price: parseFloat(fd.get('price')),
      quantity_in_stock: parseInt(fd.get('quantity_in_stock')),
      min_threshold: parseInt(fd.get('min_threshold'))
    }
    
    try {
      if (modalMode === 'add') {
        await parts.create(body)
        toast.success('Part added successfully')
      } else {
        await parts.update(modalMode.id, body)
        toast.success('Part updated successfully')
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
    if (!window.confirm('Are you sure you want to remove this part?')) return
    try {
      await parts.remove(id)
      toast.success('Part removed')
      setKey(k => k + 1)
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto font-semibold">Spare Parts Inventory</h2>
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
          <input className="input !pl-9" placeholder="Search parts..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search inventory" />
        </div>
        <Button onClick={() => setModalMode('add')} icon={Plus}>Add Part</Button>
      </div>
      {loading && !data ? <SkeletonRows /> : data?.items.length === 0 ? (
        <EmptyState icon={Package} title="No parts found" text="Try a different search query or add a new part." action={<Button onClick={() => setModalMode('add')} icon={Plus}>Add Part</Button>} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Name</th>
                <th className="th">Price</th>
                <th className="th">In Stock</th>
                <th className="th">Min Threshold</th>
                <th className="th text-right">Actions</th>
              </tr></thead>
              <tbody className={cx('divide-y divide-line transition', loading && 'opacity-60')}>
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2/60">
                    <td className="td font-semibold">
                      {p.name}
                      {p.is_low_stock && <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400"><AlertTriangle className="h-3 w-3" /> LOW STOCK</span>}
                    </td>
                    <td className="td">{inr(p.price)}</td>
                    <td className="td"><span className={cx("font-semibold", p.is_low_stock ? "text-red-600 dark:text-red-400" : "")}>{p.quantity_in_stock}</span></td>
                    <td className="td text-muted">{p.min_threshold}</td>
                    <td className="td text-right">
                      <button className="btn-secondary btn-sm mr-2" onClick={() => setModalMode(p)}>Edit</button>
                      <button className="btn-secondary btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => handleRemove(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}

      <Modal open={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === 'add' ? 'Add Part' : 'Edit Part'}>
        <form id="part-form" onSubmit={handleSave} className="space-y-4">
          <Input label="Part Name" name="name" required defaultValue={modalMode !== 'add' ? modalMode?.name : ''} />
          <Input label="Price (₹)" type="number" step="0.01" name="price" required defaultValue={modalMode !== 'add' ? modalMode?.price : ''} />
          <Input label="Quantity in Stock" type="number" name="quantity_in_stock" required defaultValue={modalMode !== 'add' ? modalMode?.quantity_in_stock : ''} />
          <Input label="Minimum Threshold" type="number" name="min_threshold" required defaultValue={modalMode !== 'add' ? modalMode?.min_threshold : ''} />
        </form>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalMode(null)}>Cancel</Button>
          <Button type="submit" form="part-form" loading={busy}>{modalMode === 'add' ? 'Add Part' : 'Save Changes'}</Button>
        </div>
      </Modal>
    </div>
  )
}
