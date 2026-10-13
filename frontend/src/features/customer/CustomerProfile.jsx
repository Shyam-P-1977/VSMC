import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { User, Phone, MapPin, Lock, Save } from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import { Card, Button, Input } from '../../shared/ui';
import { useAuth } from '../../app/context/AuthContext';
import { authApi } from '../../api';

export function CustomerProfile() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.Name || '');
  const [contact, setContact] = useState(user?.Contact || '');
  const [address, setAddress] = useState(user?.Address || '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (contact && !/^\d{10}$/.test(contact)) {
      toast.error('Contact must be a 10-digit number');
      return;
    }

    if (password && password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setSubmitting(true);
      await authApi.updateProfile({
        name,
        contact,
        address,
        ...(password ? { password } : {})
      });
      toast.success('Profile details updated successfully');
      refreshUser();
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Profile & Preferences"
      subtitle="Manage your personal contact credentials and security settings"
    >
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 md:p-8 space-y-6 bg-white dark:bg-slate-900 shadow-soft rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
              Account Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your contact details are used for vehicle delivery alerts and automated billing
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email (Read Only)"
                value={user?.Email || ''}
                disabled
                helperText="Account email cannot be modified"
              />

              <Input
                label="Phone (10 Digits)"
                icon={Phone}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
              />
            </div>

            <Input
              label="Home / Workshop Delivery Address"
              icon={MapPin}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Change Password (Leave blank to keep current)
              </h4>
              <Input
                label="New Password"
                type="password"
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 8 characters"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
                icon={Save}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
