import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, X, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button, Input, Textarea } from '../../shared/ui';
import { centerApi } from '../../api';

export function RegisterCenterModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_email: '',
    owner_password: '',
    owner_contact: '',
    center_name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Pune',
    area: '',
    pincode: '',
    working_hours: '09:00 - 18:00',
    working_days: 'Monday - Saturday',
    description: ''
  });

  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCities() {
      try {
        const res = await centerApi.getCities();
        const cList = (res.cities || []).map((c) => (typeof c === 'object' && c !== null ? c.name : c));
        setCities(cList);
        if (cList.length > 0 && !formData.city) {
          setFormData(prev => ({ ...prev, city: cList[0] }));
        }
      } catch {
        // ignore
      }
    }
    loadCities();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !formData.city) return;
    async function loadAreas() {
      try {
        const res = await centerApi.getAreas(formData.city);
        const aList = res.areas || [];
        setAreas(aList);
        if (aList.length > 0) {
          setFormData(prev => ({ ...prev, area: aList[0].name, pincode: aList[0].pincode }));
        }
      } catch {
        // ignore
      }
    }
    loadAreas();
  }, [isOpen, formData.city]);

  const [createdCode, setCreatedCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.owner_name || !formData.owner_email || !formData.owner_password || !formData.center_name || !formData.city) {
      toast.error('Please complete all mandatory fields');
      return;
    }

    try {
      setLoading(true);
      const res = await centerApi.registerCenter({
        name: formData.center_name,
        center_name: formData.center_name,
        owner_name: formData.owner_name,
        email: formData.owner_email,
        owner_email: formData.owner_email,
        password: formData.owner_password,
        owner_password: formData.owner_password,
        phone: formData.owner_contact,
        owner_contact: formData.owner_contact,
        address: formData.address,
        city: formData.city,
        area: formData.area || formData.city,
        pincode: formData.pincode,
        working_hours: formData.working_hours,
        working_days: formData.working_days,
        state: 'Maharashtra'
      });
      const code = res.center_code || res.center?.center_code;
      setCreatedCode(code);
      setSuccess(true);
      toast.success(res.message || 'Service center registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      toast.success(`Center Code ${createdCode} copied to clipboard!`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Service Center Registered!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your workshop <strong>{formData.center_name}</strong> in {formData.city} has been created.
            </p>

            {createdCode && (
              <div className="p-4 rounded-2xl bg-yellow-signal/15 dark:bg-yellow-signal/10 border-2 border-yellow-signal/40 max-w-sm mx-auto text-center space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 dark:text-yellow-signal block">
                  Your Official Center Code
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-black text-teal-950 dark:text-white tracking-widest px-3 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    {createdCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-teal-900 text-yellow-signal hover:bg-teal-800 transition shadow-sm text-xs font-bold"
                    title="Copy Code"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  ⚡ Give this code to your technicians so they can register and link to your workshop!
                </p>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-3">
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-teal-900 text-yellow-signal flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Register Your Service Center
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Join Maharashtra's premier authorized automotive network
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Owner Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block uppercase text-[10px]">
                  Workshop Owner / Manager Details
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Owner Name"
                    placeholder="e.g. Ramesh Patel"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Contact Phone"
                    placeholder="10 digit mobile"
                    value={formData.owner_contact}
                    onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Login Email"
                    type="email"
                    placeholder="owner@center.com"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    required
                  />
                  <Input
                    label="Account Password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.owner_password}
                    onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Center Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block uppercase text-[10px]">
                  Workshop Name & Location
                </span>
                <Input
                  label="Service Center Trade Name"
                  placeholder="e.g. Apex Auto Works Nashik"
                  value={formData.center_name}
                  onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {cities.map((c) => {
                        const name = typeof c === 'object' && c !== null ? c.name : c;
                        return <option key={name} value={name}>{name}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Area / Locality
                    </label>
                    <select
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {areas.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                <Input
                  label="Workshop Address"
                  placeholder="Street / Industrial Area / Landmark"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={loading} icon={ArrowRight}>
                  Submit Application
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
