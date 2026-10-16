import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Wrench, Calendar, Clock, Plus, Edit2, Trash2,
  CheckCircle2, AlertCircle, RefreshCw, Layers, Sliders
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, Modal, Input, Textarea,
  Tabs, Skeleton
} from '../../shared/ui';
import { catalogApi } from '../../api';

export function AdminServices() {
  const [activeTab, setActiveTab] = useState('catalog');

  // Service Catalog state
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    Name: '',
    Description: '',
    Base_Price: '',
    Estimated_Hours: '1.5',
    Is_Active: true
  });
  const [savingService, setSavingService] = useState(false);

  // Slot Management state
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [newCapacity, setNewCapacity] = useState(3);
  const [savingSlot, setSavingSlot] = useState(false);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const res = await catalogApi.getServices(true); // true = all services including inactive
      setServices(res.services || []);
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchSlots = async (date) => {
    try {
      setLoadingSlots(true);
      const res = await catalogApi.getSlots(date);
      setSlots(res.slots || []);
    } catch {
      toast.error('Failed to load slots for selected date');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchSlots(selectedDate);
    }
  }, [activeTab, selectedDate]);

  // Service Handlers
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceForm({
      Name: '',
      Description: '',
      Base_Price: '',
      Estimated_Hours: '1.5',
      Is_Active: true
    });
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (svc) => {
    setEditingServiceId(svc.Service_ID);
    setServiceForm({
      Name: svc.Name || '',
      Description: svc.Description || '',
      Base_Price: String(svc.Base_Price || ''),
      Estimated_Hours: String(svc.Estimated_Hours || '1.0'),
      Is_Active: svc.Is_Active ?? true
    });
    setServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceForm.Name || !serviceForm.Base_Price) {
      toast.error('Please enter service name and price');
      return;
    }

    try {
      setSavingService(true);
      const basePriceNum = parseFloat(serviceForm.Base_Price);
      const estHoursNum = parseFloat(serviceForm.Estimated_Hours || 1.0);
      const payload = {
        name: serviceForm.Name.trim(),
        Name: serviceForm.Name.trim(),
        description: serviceForm.Description ? serviceForm.Description.trim() : '',
        Description: serviceForm.Description ? serviceForm.Description.trim() : '',
        base_price: basePriceNum,
        Base_Price: basePriceNum,
        estimated_hours: estHoursNum,
        Estimated_Hours: estHoursNum,
        is_active: Boolean(serviceForm.Is_Active),
        Is_Active: Boolean(serviceForm.Is_Active)
      };

      if (editingServiceId) {
        await catalogApi.updateService(editingServiceId, payload);
        toast.success('Service updated successfully');
      } else {
        await catalogApi.createService(payload);
        toast.success('New service created');
      }
      setServiceModalOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save service');
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleServiceActive = async (svc) => {
    try {
      const nextActive = !svc.Is_Active;
      await catalogApi.updateService(svc.Service_ID, {
        is_active: nextActive,
        Is_Active: nextActive
      });
      toast.success(`Service ${nextActive ? 'activated' : 'deactivated'}`);
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle service status');
    }
  };

  // Slot Handlers
  const handleOpenEditSlot = (slot) => {
    setSelectedSlot(slot);
    setNewCapacity(slot.Capacity);
    setSlotModalOpen(true);
  };

  const handleSlotCapacitySubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    try {
      setSavingSlot(true);
      await catalogApi.updateSlotCapacity(selectedSlot.Slot_ID, Number(newCapacity));
      toast.success(`Slot capacity updated to ${newCapacity}`);
      setSlotModalOpen(false);
      fetchSlots(selectedDate);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update slot capacity');
    } finally {
      setSavingSlot(false);
    }
  };

  return (
    <DashboardLayout
      title="Service Catalog & Workshop Capacity"
      subtitle="Configure standard service offerings, base pricing, and daily garage slot quotas"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'catalog'
                ? 'border-teal-700 text-teal-800 dark:border-signal-yellow dark:text-signal-yellow'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Service Offerings ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'slots'
                ? 'border-teal-700 text-teal-800 dark:border-signal-yellow dark:text-signal-yellow'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Daily Slot Capacity
          </button>
        </div>

        {/* TAB 1: SERVICE CATALOG */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Standard packages and bookable maintenance services displayed to customers.
              </p>
              <Button variant="primary" onClick={handleOpenAddService}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Service
              </Button>
            </div>

            {loadingServices ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Service Name</th>
                        <th className="py-3.5 px-4">Description</th>
                        <th className="py-3.5 px-4">Base Price</th>
                        <th className="py-3.5 px-4">Est. Time</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                      {services.map(svc => (
                        <tr key={svc.Service_ID} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                            {svc.Name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-neutral-500 max-w-sm truncate">
                            {svc.Description || 'No description entered'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-teal-800 dark:text-teal-300">
                            ₹{svc.Base_Price?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                            {svc.Estimated_Hours} hrs
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={svc.Is_Active ? 'success' : 'neutral'}>
                              {svc.Is_Active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenEditService(svc)}
                                className="text-xs py-1 px-2.5 h-auto"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant={svc.Is_Active ? 'outline' : 'primary'}
                                onClick={() => handleToggleServiceActive(svc)}
                                className="text-xs py-1 px-2.5 h-auto"
                              >
                                {svc.Is_Active ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DAILY SLOT CAPACITY */}
        {activeTab === 'slots' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase">Selected Operating Date</div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="mt-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-sm font-semibold text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => fetchSlots(selectedDate)}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Refresh Slots
              </Button>
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
              </div>
            ) : slots.length === 0 ? (
              <Card className="text-center py-12">
                <Clock className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-neutral-800 dark:text-white">No Slots Generated</h3>
                <p className="text-sm text-neutral-500 mt-1">Slots are automatically created when accessed for this date.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map(slot => {
                  const percent = Math.min(100, Math.round((slot.Booked_Count / slot.Capacity) * 100));
                  const isFull = slot.Booked_Count >= slot.Capacity;

                  return (
                    <Card key={slot.Slot_ID} className="relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                          <span className="font-bold text-neutral-900 dark:text-white text-sm">
                            {slot.Start_Time?.slice(0, 5)} - {slot.End_Time?.slice(0, 5)}
                          </span>
                        </div>
                        <Badge variant={isFull ? 'danger' : percent > 50 ? 'warning' : 'success'}>
                          {isFull ? 'Full' : `${slot.Capacity - slot.Booked_Count} open`}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-neutral-500">
                          <span>Occupancy</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {slot.Booked_Count} / {slot.Capacity} vehicles
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isFull ? 'bg-red-500' : percent > 50 ? 'bg-amber-500' : 'bg-teal-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEditSlot(slot)}
                          className="text-xs py-1 px-2.5 h-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Adjust Capacity
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Add / Edit Service Modal */}
        <Modal
          isOpen={serviceModalOpen}
          onClose={() => setServiceModalOpen(false)}
          title={editingServiceId ? 'Edit Catalog Service' : 'Add New Service Package'}
        >
          <form onSubmit={handleServiceSubmit} className="space-y-4">
            <Input
              label="Service Title"
              required
              value={serviceForm.Name}
              onChange={e => setServiceForm({ ...serviceForm, Name: e.target.value })}
              placeholder="e.g. Comprehensive Diagnostic Scan"
            />
            <Textarea
              label="Service Scope & Inclusions"
              value={serviceForm.Description}
              onChange={e => setServiceForm({ ...serviceForm, Description: e.target.value })}
              placeholder="Describe what is inspected, replaced, or calibrated"
              rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Base Price (INR ₹)"
                type="number"
                required
                value={serviceForm.Base_Price}
                onChange={e => setServiceForm({ ...serviceForm, Base_Price: e.target.value })}
                placeholder="2500"
              />
              <Input
                label="Estimated Hours"
                type="number"
                step="0.5"
                required
                value={serviceForm.Estimated_Hours}
                onChange={e => setServiceForm({ ...serviceForm, Estimated_Hours: e.target.value })}
                placeholder="2.0"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="service-active"
                checked={serviceForm.Is_Active}
                onChange={e => setServiceForm({ ...serviceForm, Is_Active: e.target.checked })}
                className="rounded text-teal-700 focus:ring-teal-700 w-4 h-4"
              />
              <label htmlFor="service-active" className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                Available for Customer Online Booking
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingService}>
                {editingServiceId ? 'Save Changes' : 'Create Service'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Adjust Slot Capacity Modal */}
        <Modal
          isOpen={slotModalOpen}
          onClose={() => setSlotModalOpen(false)}
          title={`Adjust Slot Capacity (${selectedSlot?.Start_Time?.slice(0, 5)} - ${selectedSlot?.End_Time?.slice(0, 5)})`}
        >
          <form onSubmit={handleSlotCapacitySubmit} className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Set maximum simultaneous bookings permissible for this workshop time window on {selectedDate}.
            </p>
            <Input
              label="Maximum Vehicle Capacity"
              type="number"
              min={selectedSlot?.Booked_Count || 1}
              max="20"
              required
              value={newCapacity}
              onChange={e => setNewCapacity(e.target.value)}
              helperText={`Currently booked: ${selectedSlot?.Booked_Count || 0} vehicles. Capacity cannot be lower than existing bookings.`}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setSlotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingSlot}>
                Update Capacity
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
