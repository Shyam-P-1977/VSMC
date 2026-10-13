import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Car, Plus, History, Edit, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Input, Select, Modal, NumberPlate,
  EmptyState, StatusBadge, Skeleton
} from '../../shared/ui';
import { vehicleApi } from '../../api';

export function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: '2023',
    fuel_type: 'Petrol',
    color: 'Black'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await vehicleApi.list();
      setVehicles(res.vehicles || []);
    } catch {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      registration_number: '',
      make: '',
      model: '',
      year: '2023',
      fuel_type: 'Petrol',
      color: 'Black'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setSelectedVehicle(v);
    setFormData({
      registration_number: v.Registration_Number,
      make: v.Make,
      model: v.Model,
      year: String(v.Year),
      fuel_type: v.Fuel_Type,
      color: v.Color
    });
    setIsEditModalOpen(true);
  };

  const handleOpenHistory = async (v) => {
    setSelectedVehicle(v);
    setIsHistoryModalOpen(true);
    try {
      setHistoryLoading(true);
      const res = await vehicleApi.getHistory(v.Vehicle_ID);
      setVehicleHistory(res.history || []);
    } catch {
      toast.error('Could not load service history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!formData.registration_number.trim() || !formData.make.trim() || !formData.model.trim()) {
      toast.error('Registration plate, make, and model are required');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditModalOpen && selectedVehicle) {
        await vehicleApi.update(selectedVehicle.Vehicle_ID, formData);
        toast.success('Vehicle details updated successfully');
        setIsEditModalOpen(false);
      } else {
        await vehicleApi.add(formData);
        toast.success('Vehicle registered to your garage');
        setIsAddModalOpen(false);
      }
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="My Vehicles Garage"
      subtitle="Manage your registered cars, manufacturing specs, and historical maintenance"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
              Registered Garage Fleet ({vehicles.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unique license plate registrations across all garage work orders
            </p>
          </div>

          <Button variant="primary" onClick={handleOpenAdd} icon={Plus}>
            Add Vehicle
          </Button>
        </div>

        {/* Vehicles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="Your garage is empty"
            description="Add your car's registration plate to begin booking periodic maintenance and emergency triage."
            icon={Car}
            actionLabel="Add Your Vehicle"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <Card
                key={v.Vehicle_ID}
                hoverEffect
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-soft flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <NumberPlate registrationNumber={v.Registration_Number} size="md" />
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                      {v.Fuel_Type}
                    </span>
                  </div>

                  <h4 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
                    {v.Make} {v.Model}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Year</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{v.Year}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Color</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{v.Color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button
                    onClick={() => handleOpenHistory(v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-yellow-signal hover:underline"
                  >
                    <History className="w-4 h-4" />
                    <span>Service History</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit vehicle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
        title={isEditModalOpen ? "Edit Vehicle Details" : "Register Vehicle to Garage"}
        subtitle="Indian vehicle registration numbers are normalized to uppercase with no spaces"
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          <Input
            label="Registration Number (Globally Unique)"
            placeholder="e.g. MH 12 AB 1234"
            value={formData.registration_number}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value.toUpperCase() })}
            required
            helperText="Normalized as standard Indian number plate (e.g. MH12AB1234)"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Make / Manufacturer"
              placeholder="e.g. Hyundai, Tata, Honda"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              required
            />
            <Input
              label="Model"
              placeholder="e.g. Creta SX, Nexon EV"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Manufacturing Year"
              type="number"
              min="1980"
              max="2030"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              required
            />
            <Select
              label="Fuel Type"
              value={formData.fuel_type}
              onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
              options={[
                { value: 'Petrol', label: 'Petrol' },
                { value: 'Diesel', label: 'Diesel' },
                { value: 'Electric', label: 'Electric (EV)' },
                { value: 'CNG', label: 'CNG / Hybrid' }
              ]}
            />
            <Input
              label="Exterior Color"
              placeholder="e.g. Phantom Black"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
            >
              {isEditModalOpen ? "Save Changes" : "Register Car"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Service History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        maxWidth="max-w-3xl"
        title={selectedVehicle ? `${selectedVehicle.Make} ${selectedVehicle.Model} Service History` : "Service History"}
        subtitle={selectedVehicle?.Registration_Number}
      >
        {historyLoading ? (
          <div className="space-y-3 py-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : vehicleHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            No service requests found for this vehicle.
          </div>
        ) : (
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {vehicleHistory.map((req) => (
              <div
                key={req.Request_ID}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      Work Order #{req.Request_ID}
                    </span>
                    <StatusBadge status={req.Status} />
                    <span className="text-xs text-slate-400 font-mono">
                      {req.Created_At ? new Date(req.Created_At).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2">
                    {req.Problem_Description || "Routine periodic service"}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {req.Invoice_Total ? (
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      ₹{req.Invoice_Total.toLocaleString('en-IN')}
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-400">
                    {req.Slot?.Date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
