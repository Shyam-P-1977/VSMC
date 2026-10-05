import { useState } from 'react'
import { useAsync } from '../../lib/hooks'
import { admin, slots } from '../../api'
import { apiError } from '../../api/client'
import { Settings, CalendarClock } from 'lucide-react'
import { Button, Card, Input, cx } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminSlots() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [key, setKey] = useState(0)

  const { data: settingsData } = useAsync(admin.settings, [])
  const { data: slotsData, loading: slotsLoading } = useAsync(() => slots.list(date), [date, key])

  const [savingSettings, setSavingSettings] = useState(false)
  const [bulkCapacity, setBulkCapacity] = useState('')

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    const fd = new FormData(e.target)
    try {
      await admin.updateSettings(Object.fromEntries(fd))
      toast.success('Settings updated')
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpdateSlot = async (id, capacity) => {
    try {
      await slots.update(id, capacity)
      toast.success('Slot capacity updated')
      setKey(k => k + 1)
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkCapacity) return
    try {
      await slots.bulk(date, parseInt(bulkCapacity))
      toast.success('Bulk capacity updated')
      setKey(k => k + 1)
      setBulkCapacity('')
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-line pb-4">
            <Settings className="h-6 w-6 text-brand-500" />
            <h2 className="text-lg font-semibold">Global Settings</h2>
          </div>
          {settingsData ? (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <Input label="GST Rate (%)" name="gst_rate" type="number" step="0.1" defaultValue={settingsData.gst_rate} />
              <Input label="Default Labour Rate (₹/hr)" name="labour_rate" type="number" defaultValue={settingsData.labour_rate} />
              <Input label="Working Hours" name="working_hours" defaultValue={settingsData.working_hours} placeholder="e.g. 09:00-18:00" />
              <Input label="Default Slot Capacity" name="default_slot_capacity" type="number" defaultValue={settingsData.default_slot_capacity} />
              <div className="pt-2">
                <Button type="submit" loading={savingSettings}>Save Settings</Button>
              </div>
            </form>
          ) : (
            <div className="animate-pulse space-y-4">
              <div className="h-10 rounded bg-surface-2" />
              <div className="h-10 rounded bg-surface-2" />
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-6 w-6 text-brand-500" />
              <h2 className="text-lg font-semibold">Slot Capacity</h2>
            </div>
            <input type="date" className="input !w-auto !py-1.5" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="mb-6 flex items-end gap-3 rounded-xl bg-surface-2 p-4">
            <div className="flex-1">
              <Input label="Bulk Set Capacity" type="number" min="0" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} placeholder="e.g. 5" />
            </div>
            <Button variant="secondary" onClick={handleBulkUpdate} disabled={!bulkCapacity}>Apply to all</Button>
          </div>

          <div className="space-y-2">
            {slotsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-12 rounded-xl bg-surface-2" />
                <div className="h-12 rounded-xl bg-surface-2" />
              </div>
            ) : slotsData?.items?.length > 0 ? (
              slotsData.items.map((slot) => (
                <div key={slot.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line p-3 hover:bg-surface-2/50">
                  <div>
                    <span className="font-semibold">{slot.start_time}</span> - <span className="text-muted">{slot.end_time}</span>
                    <div className="text-xs text-muted">Booked: {slot.booked_count}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Capacity:</span>
                    <input 
                      type="number" 
                      min="0" 
                      className="input !w-20 !py-1 text-center" 
                      defaultValue={slot.capacity}
                      onBlur={(e) => {
                        if (e.target.value !== String(slot.capacity)) {
                          handleUpdateSlot(slot.id, parseInt(e.target.value))
                        }
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted">No slots available for this date.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
