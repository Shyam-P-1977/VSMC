import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, MapPin, Clock, Phone, Mail, FileText,
  Save, Star, ShieldCheck, CheckCircle2, AlertCircle, Copy, CheckCheck
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import { Card, Button, Input, Textarea, Badge } from '../../shared/ui';
import { centerApi } from '../../api';

export function AdminCenterProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    center_code: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    area: '',
    state: 'Maharashtra',
    pincode: '',
    working_hours: '09:00 - 18:00',
    working_days: 'Monday - Saturday',
    description: '',
    approval_status: 'Approved',
    avg_rating: 4.8
  });

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Service Center Code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await centerApi.getCenterProfile();
        if (res.center) {
          setProfile({
            name: res.center.name || '',
            center_code: res.center.center_code || 'VSC-PUN-E314',
            phone: res.center.phone || '',
            email: res.center.email || '',
            address: res.center.address || '',
            city: res.center.city || '',
            area: res.center.area || '',
            state: res.center.state || 'Maharashtra',
            pincode: res.center.pincode || '',
            working_hours: res.center.working_hours || '09:00 - 18:00',
            working_days: res.center.working_days || 'Monday - Saturday',
            description: res.center.description || '',
            approval_status: res.center.approval_status || 'Approved',
            avg_rating: res.center.avg_rating || 4.8
          });
        }
      } catch {
        toast.error('Failed to load workshop profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await centerApi.updateCenterProfile(profile);
      toast.success('Service center profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update workshop profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Workshop Profile & Operating Hours"
      subtitle="Manage your authorized service center location, working schedule, and contact details"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading workshop configuration...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <Card className="p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-900">
              {/* Header Status */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-900 text-yellow-signal flex items-center justify-center font-bold text-lg shadow">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white">
                      {profile.name || 'Service Center Profile'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Maharashtra Authorized Automotive Workshop
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase">
                    ● {profile.approval_status}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{Number(profile.avg_rating).toFixed(1)} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Service Center Code Credential Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-teal-600/30 dark:border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-yellow-signal">
                      OFFICIAL SERVICE CENTER CODE
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold">
                      Read-only Credential
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Mechanics enter this unique code during signup to join your workshop team and receive job assignments.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                  <span className="font-mono text-xl font-black text-teal-900 dark:text-yellow-signal tracking-widest select-all">
                    {profile.center_code || 'VSC-PUN-E314'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(profile.center_code || 'VSC-PUN-E314')}
                    className="p-1.5 rounded-lg bg-teal-900 hover:bg-teal-800 text-yellow-signal text-xs font-bold transition-all active:scale-95 cursor-pointer ml-1"
                    title="Copy Center Code"
                  >
                    {copiedCode ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Center Trade Name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
                <Input
                  label="Contact Phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Official Email Address"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
                <Input
                  label="Postal Pincode"
                  value={profile.pincode}
                  onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                />
              </div>

              {/* Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="City"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  required
                />
                <Input
                  label="Area / Locality"
                  value={profile.area}
                  onChange={(e) => setProfile({ ...profile, area: e.target.value })}
                  required
                />
                <Input
                  label="State"
                  value={profile.state}
                  disabled
                />
              </div>

              <Input
                label="Full Street Address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                required
              />

              {/* Working Hours & Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Operating Hours (e.g. 09:00 - 18:00)"
                  value={profile.working_hours}
                  onChange={(e) => setProfile({ ...profile, working_hours: e.target.value })}
                  required
                />
                <Input
                  label="Working Days (e.g. Monday - Saturday)"
                  value={profile.working_days}
                  onChange={(e) => setProfile({ ...profile, working_days: e.target.value })}
                  required
                />
              </div>

              <Textarea
                label="Workshop Description / Facilities"
                rows={3}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Mention certified diagnostic equipment, customer lounge, express bays..."
              />

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={saving}
                  icon={Save}
                >
                  Save Profile Changes
                </Button>
              </div>
            </Card>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
