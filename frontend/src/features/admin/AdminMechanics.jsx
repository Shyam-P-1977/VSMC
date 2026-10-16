import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Wrench, Phone, Mail, CheckCircle2, XCircle,
  AlertTriangle, Edit2, Shield, Activity, Power
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, Modal, Select, Skeleton
} from '../../shared/ui';
import { adminApi } from '../../api';

export function AdminMechanics() {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Mechanic Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMechId, setEditMechId] = useState(null);
  const [editData, setEditData] = useState({
    Specialization: '',
    Is_Available: true
  });
  const [updating, setUpdating] = useState(false);

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listMechanics();
      setMechanics(res.mechanics || []);
    } catch {
      toast.error('Failed to load mechanics directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  const handleOpenEdit = (mech) => {
    setEditMechId(mech.Mechanic_ID);
    setEditData({
      Specialization: mech.Specialization || 'General Diagnostics',
      Is_Available: mech.Is_Available ?? true
    });
    setEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      await adminApi.updateMechanic(editMechId, editData);
      toast.success('Mechanic profile updated');
      setEditModalOpen(false);
      fetchMechanics();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update mechanic profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (mech) => {
    const currentActive = mech.User?.Is_Active ?? true;
    const targetStatus = !currentActive;

    // Safety warning if trying to deactivate a mechanic with active jobs
    if (!targetStatus && (mech.Active_Jobs_Count || 0) > 0) {
      toast.error(
        `Cannot deactivate ${mech.User?.Name}: Mechanic currently has ${mech.Active_Jobs_Count} ongoing active work orders! Reassign or complete them first.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      await adminApi.toggleUserActive(mech.User_ID, targetStatus);
      toast.success(`Mechanic ${targetStatus ? 'activated' : 'deactivated'}`);
      fetchMechanics();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle mechanic account status');
    }
  };

  const availableCount = mechanics.filter(m => m.Is_Available).length;

  return (
    <DashboardLayout
      title="Workshop Mechanics & Technicians"
      subtitle="Staff roster, specializations, active job workload, and authorization access"
    >
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="teal" className="text-sm px-3.5 py-1.5 font-bold">
              {mechanics.length} Registered Technicians
            </Badge>
            <Badge variant="success" className="text-sm px-3.5 py-1.5 font-semibold">
              {availableCount} Available for Dispatch
            </Badge>
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 px-4 py-2.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600 dark:text-signal-yellow shrink-0" />
            <span>Technicians join this center during registration using your workshop's <strong>Center Code</strong>.</span>
          </div>
        </div>

        {/* Mechanics Grid / Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : mechanics.length === 0 ? (
          <Card className="text-center py-12">
            <Wrench className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">No Technicians Registered</h3>
            <p className="text-sm text-neutral-500 mt-1">Technicians who register using this workshop's center code will automatically appear in this roster.</p>
          </Card>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Technician Name</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Specialization</th>
                    <th className="py-3.5 px-4">Active Jobs</th>
                    <th className="py-3.5 px-4">Availability</th>
                    <th className="py-3.5 px-4">Account Access</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {mechanics.map(m => {
                    const mechName = m.User?.Name || m.Name || m.name || `Technician #${m.Mechanic_ID}`;
                    const mechEmail = m.User?.Email || m.Email || m.email || '';
                    const mechContact = m.User?.Contact || m.Contact || m.phone || 'N/A';
                    const isActive = m.User?.Is_Active ?? m.Is_Active ?? true;
                    const hasActiveJobs = (m.Active_Jobs_Count || 0) > 0;

                    return (
                      <tr key={m.Mechanic_ID} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            {mechName}
                            <span className="text-xs font-mono font-normal text-neutral-400">#M{m.Mechanic_ID}</span>
                          </div>
                          <div className="text-xs text-neutral-500">{mechEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            {mechContact}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="teal" className="text-xs">
                            {m.Specialization || 'General Repairs'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-xl ${
                            hasActiveJobs
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}>
                            <Activity className="w-3 h-3" />
                            {m.Active_Jobs_Count || 0} ongoing
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={m.Is_Available ? 'success' : 'neutral'}>
                            {m.Is_Available ? 'Available' : 'Busy / Off'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={isActive ? 'success' : 'danger'}>
                            {isActive ? 'Active' : 'Deactivated'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenEdit(m)}
                              className="text-xs py-1 px-2.5 h-auto"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={isActive ? 'danger' : 'outline'}
                              onClick={() => handleToggleActive(m)}
                              className="text-xs py-1 px-2.5 h-auto"
                            >
                              <Power className="w-3.5 h-3.5 mr-1" />
                              {isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {/* Edit Mechanic Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Mechanic Work Profile"
        >
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <Select
              label="Primary Specialization"
              value={editData.Specialization}
              onChange={e => setEditData({ ...editData, Specialization: e.target.value })}
              options={[
                { value: 'Engine & Transmission Overhaul', label: 'Engine & Transmission Overhaul' },
                { value: 'Braking & ABS Hydraulics', label: 'Braking & ABS Hydraulics' },
                { value: 'Automotive Electrical & OBD Scan', label: 'Automotive Electrical & OBD Scan' },
                { value: 'HVAC & Climate Control', label: 'HVAC & Climate Control' },
                { value: 'Suspension & Wheel Alignment', label: 'Suspension & Wheel Alignment' },
                { value: 'General Diagnostics', label: 'General Diagnostics' }
              ]}
            />

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editData.Is_Available}
                  onChange={e => setEditData({ ...editData, Is_Available: e.target.checked })}
                  className="rounded text-teal-700 focus:ring-teal-700 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white">
                    Available for New Job Dispatches
                  </div>
                  <div className="text-xs text-neutral-500">
                    When unchecked, technician will not appear in the assignment drawer for pending bookings.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={updating}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
