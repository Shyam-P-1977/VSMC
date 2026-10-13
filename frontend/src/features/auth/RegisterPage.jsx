import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wrench, ArrowRight, Lock, Mail, User, Phone, MapPin,
  Building2, Car, ShieldCheck, CheckCircle2, Copy, AlertCircle, Sparkles
} from 'lucide-react';
import { Button, Input, Select, Card, ThemeToggle, Badge } from '../../shared/ui';
import { useAuth } from '../../app/context/AuthContext';
import { centerApi } from '../../api';

export function RegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, registerMechanic } = useAuth();

  const activeTabParam = searchParams.get('tab') || 'customer';
  const [role, setRole] = useState(
    ['customer', 'center', 'mechanic'].includes(activeTabParam) ? activeTabParam : 'customer'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['customer', 'center', 'mechanic'].includes(tab)) {
      setRole(tab);
    }
  }, [searchParams]);

  const handleTabChange = (newRole) => {
    setRole(newRole);
    setSearchParams({ tab: newRole });
  };

  // ==========================================
  // SHARED CITY & AREA DATA
  // ==========================================
  const [cities, setCities] = useState(['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Thane']);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await centerApi.getCities();
        const cList = (res.cities || []).map((c) => (typeof c === 'object' && c !== null ? c.name : c));
        if (cList.length > 0) setCities(cList);
      } catch {
        // fallback to defaults
      }
    }
    fetchCities();
  }, []);

  // ==========================================
  // CUSTOMER STATE & HANDLER
  // ==========================================
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    contact: '',
    address: '',
    city: 'Pune',
    area: '',
    password: '',
    confirmPassword: ''
  });
  const [customerLoading, setCustomerLoading] = useState(false);

  useEffect(() => {
    if (role !== 'customer' && role !== 'center') return;
    const targetCity = role === 'customer' ? customerData.city : centerData.city;
    if (!targetCity) return;

    async function fetchAreas() {
      try {
        const res = await centerApi.getAreas(targetCity);
        const aList = res.areas || [];
        setAreas(aList);
        if (aList.length > 0) {
          if (role === 'customer' && !customerData.area) {
            setCustomerData((prev) => ({ ...prev, area: aList[0].name }));
          }
          if (role === 'center' && !centerData.area) {
            setCenterData((prev) => ({
              ...prev,
              area: aList[0].name,
              pincode: aList[0].pincode || ''
            }));
          }
        }
      } catch {
        // ignore
      }
    }
    fetchAreas();
  }, [role, customerData.city]);

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();

    if (!customerData.name || !customerData.email || !customerData.contact || !customerData.password) {
      toast.error('Please complete all mandatory fields');
      return;
    }

    const cleanContact = customerData.contact.replace(/\D/g, '').slice(-10);
    if (cleanContact.length !== 10) {
      toast.error('Contact phone must be exactly 10 digits');
      return;
    }

    if (customerData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (customerData.password !== customerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setCustomerLoading(true);
      await register({
        name: customerData.name.trim(),
        email: customerData.email.trim().toLowerCase(),
        contact: cleanContact,
        phone: cleanContact,
        address: customerData.address.trim(),
        city: customerData.city,
        area: customerData.area,
        password: customerData.password
      });
      toast.success('Account created successfully! Welcome to VSCMS.');
      navigate('/customer/centers');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setCustomerLoading(false);
    }
  };

  // ==========================================
  // SERVICE CENTER STATE & HANDLER
  // ==========================================
  const [centerData, setCenterData] = useState({
    owner_name: '',
    owner_email: '',
    owner_password: '',
    owner_contact: '',
    center_name: '',
    address: '',
    city: 'Pune',
    area: '',
    pincode: '',
    working_hours: '09:00 - 18:00',
    working_days: 'Monday - Saturday',
    description: ''
  });
  const [centerLoading, setCenterLoading] = useState(false);
  const [createdCenterResult, setCreatedCenterResult] = useState(null);

  const handleCenterSubmit = async (e) => {
    e.preventDefault();

    if (
      !centerData.owner_name ||
      !centerData.owner_email ||
      !centerData.owner_password ||
      !centerData.owner_contact ||
      !centerData.center_name ||
      !centerData.city
    ) {
      toast.error('Please complete all mandatory workshop and owner fields');
      return;
    }

    const cleanPhone = centerData.owner_contact.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      toast.error('Contact phone must be exactly 10 digits');
      return;
    }

    if (centerData.owner_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setCenterLoading(true);
      const res = await centerApi.registerCenter({
        name: centerData.center_name,
        center_name: centerData.center_name,
        owner_name: centerData.owner_name,
        email: centerData.owner_email,
        owner_email: centerData.owner_email,
        password: centerData.owner_password,
        owner_password: centerData.owner_password,
        phone: cleanPhone,
        owner_contact: cleanPhone,
        address: centerData.address || `${centerData.area || centerData.city}, ${centerData.city}`,
        city: centerData.city,
        area: centerData.area || centerData.city,
        pincode: centerData.pincode,
        working_hours: centerData.working_hours,
        working_days: centerData.working_days,
        description: centerData.description,
        state: 'Maharashtra'
      });

      const assignedCode = res.center_code || res.center?.center_code;
      setCreatedCenterResult({
        code: assignedCode,
        name: centerData.center_name,
        city: centerData.city,
        email: centerData.owner_email
      });
      toast.success(res.message || 'Service Center registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Center registration failed');
    } finally {
      setCenterLoading(false);
    }
  };

  const handleCopyCenterCode = (code) => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success(`Center Code "${code}" copied to clipboard!`);
    }
  };

  // ==========================================
  // MECHANIC STATE & HANDLER (WITH CENTER CODE)
  // ==========================================
  const initialCenterCode = searchParams.get('center_code') || '';
  const [mechanicData, setMechanicData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    center_code: initialCenterCode,
    specialization: 'Engine & Powertrain Specialist',
    experience_years: 4
  });
  const [mechanicLoading, setMechanicLoading] = useState(false);
  const [verifyingCenter, setVerifyingCenter] = useState(false);
  const [verifiedCenter, setVerifiedCenter] = useState(null);
  const [centerCodeError, setCenterCodeError] = useState('');

  // Auto-verify Center Code on blur or manual check
  const handleVerifyCenterCode = async (codeToVerify) => {
    const code = (codeToVerify ?? mechanicData.center_code).trim().toUpperCase();
    if (!code) {
      setVerifiedCenter(null);
      setCenterCodeError('');
      return;
    }

    try {
      setVerifyingCenter(true);
      setCenterCodeError('');
      const res = await centerApi.verifyCenterCode(code);
      if (res.valid && res.center) {
        setVerifiedCenter(res.center);
        setCenterCodeError('');
      } else {
        setVerifiedCenter(null);
        setCenterCodeError('Center code not found. Please verify with workshop owner.');
      }
    } catch (err) {
      setVerifiedCenter(null);
      setCenterCodeError(
        err.response?.data?.error || `Invalid Center Code "${code}". No workshop found.`
      );
    } finally {
      setVerifyingCenter(false);
    }
  };

  // If query param center_code was present, auto verify on load
  useEffect(() => {
    if (initialCenterCode) {
      handleVerifyCenterCode(initialCenterCode);
    }
  }, [initialCenterCode]);

  const handleMechanicSubmit = async (e) => {
    e.preventDefault();

    if (
      !mechanicData.name ||
      !mechanicData.email ||
      !mechanicData.phone ||
      !mechanicData.password ||
      !mechanicData.center_code
    ) {
      toast.error('Please complete all mandatory technician and workshop fields');
      return;
    }

    const cleanPhone = mechanicData.phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      toast.error('Contact phone must be exactly 10 digits');
      return;
    }

    if (mechanicData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (mechanicData.password !== mechanicData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setMechanicLoading(true);
      const res = await registerMechanic({
        name: mechanicData.name.trim(),
        email: mechanicData.email.trim().toLowerCase(),
        phone: cleanPhone,
        contact: cleanPhone,
        password: mechanicData.password,
        center_code: mechanicData.center_code.trim().toUpperCase(),
        specialization: mechanicData.specialization,
        experience_years: Number(mechanicData.experience_years) || 3
      });

      toast.success(res.message || 'Technician registered successfully! Redirecting...');
      navigate('/mechanic');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Mechanic registration failed');
    } finally {
      setMechanicLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFA] dark:bg-[#022828] text-slate-900 dark:text-slate-100">
      {/* Top Bar */}
      <div className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-900 dark:bg-yellow-signal flex items-center justify-center text-yellow-signal dark:text-ink font-bold shadow">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="font-display text-2xl tracking-wider text-teal-950 dark:text-white font-black">
            VSCMS<span className="text-yellow-signal">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs font-bold text-teal-800 dark:text-teal-200 hover:text-teal-950 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition"
          >
            Sign In Instead
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-6 sm:p-10 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 my-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Create Your VSCMS Account
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your role to register as a vehicle customer, service center, or workshop technician
            </p>
          </div>

          {/* Role Toggle Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('customer')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === 'customer'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('center')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === 'center'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Service Center</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('mechanic')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === 'mechanic'
                  ? 'bg-signal-yellow text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Mechanic</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* 1. CUSTOMER REGISTRATION FORM */}
          {/* ========================================================= */}
          {role === 'customer' && (
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <Input
                label="Full Name"
                icon={User}
                placeholder="e.g. Your Full Name"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  placeholder="name@example.com"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  required
                />

                <Input
                  label="Contact Phone (10 Digits)"
                  icon={Phone}
                  placeholder="9822000000"
                  value={customerData.contact}
                  onChange={(e) => setCustomerData({ ...customerData, contact: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    City
                  </label>
                  <select
                    value={customerData.city}
                    onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Area / Locality
                  </label>
                  <select
                    value={customerData.area}
                    onChange={(e) => setCustomerData({ ...customerData, area: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                  >
                    {areas.length > 0 ? (
                      areas.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)
                    ) : (
                      <option value={customerData.city}>{customerData.city} Central</option>
                    )}
                  </select>
                </div>
              </div>

              <Input
                label="Home / Delivery Address"
                icon={MapPin}
                placeholder="e.g. Flat 402, Green Valley Apartments"
                value={customerData.address}
                onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Password (Min 8 Characters)"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={customerData.password}
                  onChange={(e) => setCustomerData({ ...customerData, password: e.target.value })}
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={customerData.confirmPassword}
                  onChange={(e) => setCustomerData({ ...customerData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-4"
                isLoading={customerLoading}
                icon={ArrowRight}
              >
                Create Customer Account
              </Button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 2. SERVICE CENTER REGISTRATION FORM */}
          {/* ========================================================= */}
          {role === 'center' && (
            <div>
              {createdCenterResult ? (
                /* Celebration Card with Center Code */
                <div className="py-6 text-center space-y-5 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Workshop Registered Successfully!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <strong>{createdCenterResult.name}</strong> has been configured in the VSCMS network.
                    </p>
                  </div>

                  {/* Highlighted Center Code Box */}
                  <div className="p-5 rounded-2xl bg-yellow-signal/15 dark:bg-yellow-signal/10 border-2 border-yellow-signal/40 max-w-md mx-auto text-center space-y-3 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 dark:text-yellow-signal block">
                      ⚡ Your Unique Workshop Center Code
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-2xl sm:text-3xl font-black text-teal-950 dark:text-white tracking-widest px-4 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                        {createdCenterResult.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCenterCode(createdCenterResult.code)}
                        className="p-2.5 rounded-xl bg-teal-900 text-yellow-signal hover:bg-teal-800 transition shadow flex items-center gap-1 text-xs font-bold"
                        title="Copy Center Code"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Share this code with your mechanics! When registering, they enter this code to join your workshop team.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 pt-3">
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/login?tab=center&email=${encodeURIComponent(createdCenterResult.email)}`)}
                    >
                      Sign In to Center Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleTabChange('mechanic');
                        setMechanicData((prev) => ({ ...prev, center_code: createdCenterResult.code }));
                        handleVerifyCenterCode(createdCenterResult.code);
                        setCreatedCenterResult(null);
                      }}
                    >
                      Register a Mechanic with this Code
                    </Button>
                  </div>
                </div>
              ) : (
                /* Service Center Form */
                <form onSubmit={handleCenterSubmit} className="space-y-4">
                  {/* Workshop Owner Details */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="font-bold text-teal-900 dark:text-teal-300 block uppercase text-[11px] tracking-wider">
                      👤 Workshop Owner / Manager Details
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Owner Full Name"
                        placeholder="e.g. Aditya Bhosale"
                        value={centerData.owner_name}
                        onChange={(e) => setCenterData({ ...centerData, owner_name: e.target.value })}
                        required
                      />
                      <Input
                        label="Contact Phone"
                        placeholder="10 digit mobile"
                        value={centerData.owner_contact}
                        onChange={(e) => setCenterData({ ...centerData, owner_contact: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Login Email"
                        type="email"
                        placeholder="owner@center.com"
                        value={centerData.owner_email}
                        onChange={(e) => setCenterData({ ...centerData, owner_email: e.target.value })}
                        required
                      />
                      <Input
                        label="Account Password"
                        type="password"
                        placeholder="Min 8 characters"
                        value={centerData.owner_password}
                        onChange={(e) => setCenterData({ ...centerData, owner_password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Workshop Name & Location */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="font-bold text-teal-900 dark:text-teal-300 block uppercase text-[11px] tracking-wider">
                      🏢 Workshop Name & Location
                    </span>
                    <Input
                      label="Service Center Trade Name"
                      placeholder="e.g. Om Sai Service Center"
                      value={centerData.center_name}
                      onChange={(e) => setCenterData({ ...centerData, center_name: e.target.value })}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          City
                        </label>
                        <select
                          value={centerData.city}
                          onChange={(e) => setCenterData({ ...centerData, city: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                        >
                          {cities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          Area / Locality
                        </label>
                        <select
                          value={centerData.area}
                          onChange={(e) => setCenterData({ ...centerData, area: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                        >
                          {areas.length > 0 ? (
                            areas.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)
                          ) : (
                            <option value={centerData.city}>{centerData.city} Central</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <Input
                      label="Workshop Address"
                      placeholder="Street, Landmark, Station Road"
                      value={centerData.address}
                      onChange={(e) => setCenterData({ ...centerData, address: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-4"
                    isLoading={centerLoading}
                    icon={Building2}
                  >
                    Register Service Center & Generate Code
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. MECHANIC REGISTRATION FORM (WITH CENTER CODE) */}
          {/* ========================================================= */}
          {role === 'mechanic' && (
            <form onSubmit={handleMechanicSubmit} className="space-y-4">
              {/* Center Code Verification Section */}
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 space-y-3">
                <span className="font-bold text-teal-900 dark:text-teal-300 block uppercase text-[11px] tracking-wider">
                  🔑 Service Center Workshop Code
                </span>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="e.g. VSC-PUN-7K2M"
                      value={mechanicData.center_code}
                      onChange={(e) => {
                        const code = e.target.value.toUpperCase();
                        setMechanicData({ ...mechanicData, center_code: code });
                        setVerifiedCenter(null);
                        setCenterCodeError('');
                      }}
                      onBlur={() => handleVerifyCenterCode()}
                      required
                      className="font-mono uppercase font-bold tracking-wider"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleVerifyCenterCode()}
                    isLoading={verifyingCenter}
                    className="whitespace-nowrap px-4"
                  >
                    Verify Code
                  </Button>
                </div>

                {/* Verification result feedback */}
                {verifiedCenter && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <strong>Verified:</strong> {verifiedCenter.name} ({verifiedCenter.city}, {verifiedCenter.area})
                    </div>
                  </div>
                )}

                {centerCodeError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>{centerCodeError}</div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ask your Service Center manager for the Center Code generated when they registered their workshop.
                </p>
              </div>

              {/* Technician Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Technician Full Name"
                  icon={User}
                  placeholder="e.g. Vikram Joshi"
                  value={mechanicData.name}
                  onChange={(e) => setMechanicData({ ...mechanicData, name: e.target.value })}
                  required
                />

                <Input
                  label="Contact Phone (10 Digits)"
                  icon={Phone}
                  placeholder="9881100000"
                  value={mechanicData.phone}
                  onChange={(e) => setMechanicData({ ...mechanicData, phone: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Staff Login Email"
                type="email"
                icon={Mail}
                placeholder="mechanic@vscms.com"
                value={mechanicData.email}
                onChange={(e) => setMechanicData({ ...mechanicData, email: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Specialization
                  </label>
                  <select
                    value={mechanicData.specialization}
                    onChange={(e) => setMechanicData({ ...mechanicData, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                  >
                    <option value="Engine & Powertrain Specialist">Engine & Powertrain Specialist</option>
                    <option value="Electrical, Battery & AC Specialist">Electrical, Battery & AC Specialist</option>
                    <option value="Brakes, Tyres & Suspension Expert">Brakes, Tyres & Suspension Expert</option>
                    <option value="Diagnostics & ECU Tuning">Diagnostics & ECU Tuning</option>
                    <option value="Transmission & Gearbox Expert">Transmission & Gearbox Expert</option>
                    <option value="General Periodic Maintenance">General Periodic Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Experience (Years)
                  </label>
                  <select
                    value={mechanicData.experience_years}
                    onChange={(e) => setMechanicData({ ...mechanicData, experience_years: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((yr) => (
                      <option key={yr} value={yr}>{yr} {yr === 1 ? 'Year' : 'Years'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Password (Min 8 Chars)"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={mechanicData.password}
                  onChange={(e) => setMechanicData({ ...mechanicData, password: e.target.value })}
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={mechanicData.confirmPassword}
                  onChange={(e) => setMechanicData({ ...mechanicData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-4"
                isLoading={mechanicLoading}
                icon={Wrench}
              >
                Join Workshop as Technician
              </Button>
            </form>
          )}

          {/* Footer Navigation */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-teal-700 dark:text-yellow-signal hover:underline">
              Sign In Instead →
            </Link>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="p-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} VSCMS. Multi-Role Automotive Management Platform.
      </div>
    </div>
  );
}
