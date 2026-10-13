import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Search, Phone, Mail, MapPin,
  Car, Calendar, Edit2, ShieldAlert, CheckCircle2, XCircle
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, Modal, Input, Textarea,
  NumberPlate, Skeleton
} from '../../shared/ui';
import { adminApi } from '../../api';

export function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [formData, setFormData] = useState({
    Name: '',
    Email: '',
    Contact: '',
    Password: '',
    Address: ''
  });
  const [saving, setSaving] = useState(false);

  // Customer Detail Modal
  const [viewCustomer, setViewCustomer] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listCustomers(search);
      setCustomers(res.customers || []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedCustomerId(null);
    setFormData({
      Name: '',
      Email: '',
      Contact: '',
      Password: '',
      Address: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setIsEditing(true);
    setSelectedCustomerId(customer.User_ID);
    setFormData({
      Name: customer.Name || '',
      Email: customer.Email || '',
      Contact: customer.Contact || '',
      Password: '',
      Address: customer.Address || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Name || !formData.Email || !formData.Contact) {
      toast.error('Please fill in Name, Email and Contact');
      return;
    }
    if (!isEditing && (!formData.Password || formData.Password.length < 8)) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await adminApi.updateCustomer(selectedCustomerId, {
          Name: formData.Name,
          Email: formData.Email,
          Contact: formData.Contact,
          Address: formData.Address
        });
        toast.success('Customer profile updated');
      } else {
        await adminApi.createCustomer(formData);
        toast.success('Customer account registered');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (customer) => {
    const newStatus = !customer.Is_Active;
    try {
      await adminApi.toggleUserActive(customer.User_ID, newStatus);
      toast.success(`Customer ${newStatus ? 'activated' : 'deactivated'}`);
      setCustomers(prev =>
        prev.map(c => c.User_ID === customer.User_ID ? { ...c, Is_Active: newStatus } : c)
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user status');
    }
  };

  return (
    <DashboardLayout
      title="Customer Management"
      subtitle="Directory of registered car owners, garage history, and account settings"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <Button variant="primary" onClick={handleOpenAdd}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Customer Directory Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : customers.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">No Customers Found</h3>
            <p className="text-sm text-neutral-500 mt-1">Try adjusting your search criteria or register a new client.</p>
          </Card>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Vehicles</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {customers.map(c => (
                    <tr key={c.User_ID} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 dark:text-white">{c.Name}</div>
                        <div className="text-xs text-neutral-500 font-mono">UID #{c.User_ID}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                          <Mail className="w-3.5 h-3.5 text-teal-600" /> {c.Email}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                          <Phone className="w-3.5 h-3.5 text-teal-600" /> {c.Contact}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                        {c.Address || 'No address specified'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setViewCustomer(c)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                        >
                          <Car className="w-3.5 h-3.5" />
                          {c.Vehicles?.length || 0} Vehicles
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={c.Is_Active ? 'success' : 'danger'}>
                          {c.Is_Active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenEdit(c)}
                            className="text-xs py-1 px-2.5 h-auto"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={c.Is_Active ? 'danger' : 'outline'}
                            onClick={() => handleToggleActive(c)}
                            className="text-xs py-1 px-2.5 h-auto"
                          >
                            {c.Is_Active ? 'Deactivate' : 'Activate'}
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

        {/* Add / Edit Customer Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={isEditing ? 'Edit Customer Information' : 'Register New Customer Account'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={formData.Name}
              onChange={e => setFormData({ ...formData, Name: e.target.value })}
              placeholder="e.g. Customer Name"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={formData.Email}
                onChange={e => setFormData({ ...formData, Email: e.target.value })}
                placeholder="customer@example.com"
              />
              <Input
                label="Contact Number (10 digits)"
                required
                value={formData.Contact}
                onChange={e => setFormData({ ...formData, Contact: e.target.value })}
                placeholder="9876543210"
              />
            </div>

            {!isEditing && (
              <Input
                label="Initial Password"
                type="password"
                required
                value={formData.Password}
                onChange={e => setFormData({ ...formData, Password: e.target.value })}
                placeholder="Minimum 8 characters"
              />
            )}

            <Textarea
              label="Postal Address"
              value={formData.Address}
              onChange={e => setFormData({ ...formData, Address: e.target.value })}
              placeholder="Full residential or billing address"
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                {isEditing ? 'Save Changes' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* View Customer's Vehicles Modal */}
        <Modal
          isOpen={!!viewCustomer}
          onClose={() => setViewCustomer(null)}
          title={`${viewCustomer?.Name}'s Garage`}
        >
          <div className="space-y-4">
            {(!viewCustomer?.Vehicles || viewCustomer.Vehicles.length === 0) ? (
              <p className="text-sm text-neutral-500 py-4 text-center">
                This customer has not registered any vehicles yet.
              </p>
            ) : (
              <div className="space-y-3">
                {viewCustomer.Vehicles.map(veh => (
                  <div
                    key={veh.Vehicle_ID}
                    className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between"
                  >
                    <div>
                      <NumberPlate plateNumber={veh.Registration_Number} size="sm" />
                      <div className="text-sm font-bold text-neutral-900 dark:text-white mt-1.5">
                        {veh.Make} {veh.Model} ({veh.Year})
                      </div>
                      <div className="text-xs text-neutral-500">
                        Fuel: {veh.Fuel_Type} | Color: {veh.Color}
                      </div>
                    </div>
                    <Badge variant="teal">Registered</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button variant="secondary" onClick={() => setViewCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
