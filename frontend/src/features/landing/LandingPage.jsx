import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wrench, ShieldCheck, Clock, CheckCircle2, DollarSign, Award,
  Activity, ArrowRight, Phone, MapPin, Sparkles, AlertTriangle,
  Building2, Star, Search, Truck
} from 'lucide-react';
import { LandingLayout } from '../../app/layouts/LandingLayout';
import {
  Button, Input, Card, Accordion,
  Squiggle, Sparkle, DottedLine, NumberPlate
} from '../../shared/ui';
import { centerApi } from '../../api';
import { useAuth } from '../../app/context/AuthContext';
import { RegisterCenterModal } from './RegisterCenterModal';

export function LandingPage() {
  const navigate = useNavigate();
  const { updateLocation, isAuthenticated } = useAuth();

  // Multi-Center discovery search state
  const [heroCity, setHeroCity] = useState('Pune');
  const [heroArea, setHeroArea] = useState('');
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [featuredCenters, setFeaturedCenters] = useState([]);
  const [registerCenterOpen, setRegisterCenterOpen] = useState(false);

  // Quick start registration state
  const [quickPlate, setQuickPlate] = useState('');

  // Load cities & featured centers
  useEffect(() => {
    async function initLandingData() {
      try {
        const [cRes, centersRes] = await Promise.all([
          centerApi.getCities(),
          centerApi.getCenters({ radius: 50 })
        ]);
        setCities(cRes.cities || ['Pune', 'Mumbai', 'Nashik', 'Nagpur']);
        setFeaturedCenters((centersRes.centers || []).slice(0, 4));
      } catch {
        // ignore
      }
    }
    initLandingData();
  }, []);

  // Load areas when heroCity changes
  useEffect(() => {
    if (!heroCity) return;
    async function loadAreas() {
      try {
        const res = await centerApi.getAreas(heroCity);
        const aList = res.areas || [];
        setAreas(aList);
        if (aList.length > 0) setHeroArea(aList[0].name);
      } catch {
        // ignore
      }
    }
    loadAreas();
  }, [heroCity]);

  const handleHeroFindCenters = async (e) => {
    e.preventDefault();
    if (!heroCity || !heroArea) {
      toast.error('Please select both city and area');
      return;
    }
    try {
      if (isAuthenticated) {
        await updateLocation({ city: heroCity, area: heroArea, state: 'Maharashtra' });
        navigate('/customer/centers');
      } else {
        sessionStorage.setItem('vscms_temp_location', JSON.stringify({ city: heroCity, area: heroArea }));
        navigate(`/login?tab=customer`);
      }
    } catch {
      navigate('/login?tab=customer');
    }
  };

  const handleQuickBook = (e) => {
    e.preventDefault();
    if (!quickPlate.trim()) {
      toast.error('Please enter your vehicle registration number');
      return;
    }
    const cleanPlate = quickPlate.replace(/\s+/g, '').toUpperCase();
    navigate(`/login?tab=customer&plate=${cleanPlate}`);
  };

  // FAQ data
  const faqItems = [
    {
      id: 1,
      question: "How does the live vehicle service tracking work?",
      answer: "Once our service advisor or technician starts work on your vehicle, your dashboard timeline updates in real time: Booked -> Assigned -> In Progress -> Ready for Pickup -> Paid. You'll also receive notifications as status changes occur."
    },
    {
      id: 2,
      question: "Are genuine OEM spare parts used during maintenance?",
      answer: "Yes, 100%. We maintain a strict inventory of OEM and certified grade-A replacement parts with full digital transparency. Every part logged into your job card shows exact unit pricing and warranty details."
    },
    {
      id: 3,
      question: "Can I describe specific weird noises or upload photos before arriving?",
      answer: "Absolutely! Our unique Problem Description step allows you to select symptom categories (engine noise, brakes, AC, warnings), record symptoms via microphone speech-to-text, and upload up to 3 diagnostic photos directly to your job order."
    },
    {
      id: 4,
      question: "What payment methods are supported on your platform?",
      answer: "We support instant online checkout via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards (Visa, Mastercard, RuPay), NetBanking across 40+ banks, as well as Cash or POS Card payments settled directly at our workshop counter."
    },
    {
      id: 5,
      question: "What is your policy if an urgent breakdown occurs?",
      answer: "Select the 'Urgent' safety toggle during booking. This immediately prioritizes your work order at the top of our administrative dispatch queue and notifies our senior workshop technicians for immediate response."
    }
  ];

  return (
    <LandingLayout>
      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 bg-white dark:bg-[#022828]">
        {/* Subtle decorative background circles */}
        <div className="absolute top-1/4 -right-28 w-96 h-96 bg-teal-100/50 dark:bg-teal-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-20 w-80 h-80 bg-signal-yellow/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline & Quick Start */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 text-xs font-semibold mb-6 border border-teal-200/80 dark:border-teal-800">
                <Sparkles className="w-3.5 h-3.5 text-signal-yellow" />
                <span>Next-Generation Workshop Experience</span>
              </div>

              {/* Clean, readable headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-4 text-slate-900 dark:text-white">
                Vehicle Care, <br />
                <span className="text-teal-700 dark:text-signal-yellow">Simple & Transparent.</span>
              </h1>

              {/* Gentle squiggle decoration */}
              <div className="mb-6 -mt-1">
                <Squiggle className="w-40 text-signal-yellow opacity-90" />
              </div>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed mb-8">
                Certified mechanics, authentic spare parts, itemized upfront pricing, and live smartphone tracking for every repair.
              </p>

              {/* Find a Service Center Near You Search Card */}
              <Card className="w-full max-w-xl p-4 bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-teal-700 dark:text-yellow-signal" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Find a Verified Service Center Near You
                  </span>
                </div>

                <form onSubmit={handleHeroFindCenters} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Select City
                      </label>
                      <select
                        value={heroCity}
                        onChange={(e) => setHeroCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      >
                        {cities.map((c) => {
                          const cityName = typeof c === 'object' && c !== null ? c.name : c;
                          return <option key={cityName} value={cityName}>{cityName}</option>;
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Select Area
                      </label>
                      <select
                        value={heroArea}
                        onChange={(e) => setHeroArea(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      >
                        {areas.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full sm:flex-1 font-bold"
                      icon={Search}
                    >
                      Find Centers
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto text-xs"
                      onClick={() => setRegisterCenterOpen(true)}
                      icon={Building2}
                    >
                      Register Your Center
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Trust highlights */}
              <div className="flex flex-wrap items-center gap-6 mt-6 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>8+ Maharashtra Hubs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Verified Mechanics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Official GST Receipts</span>
                </div>
              </div>
            </div>

            {/* Right Car Illustration & Badges */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
              <div className="w-full max-w-md bg-gradient-to-br from-teal-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-800 relative">
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-teal-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-teal-200">
                      8 Bays Active • Live Workshop
                    </span>
                  </div>
                  <NumberPlate plateNumber="MH 12 AB 1234" size="sm" />
                </div>

                {/* Car Vector Art */}
                <div className="my-6 flex flex-col items-center">
                  <svg
                    viewBox="0 0 240 120"
                    className="w-56 h-auto drop-shadow-lg"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 95H220C225 95 230 90 230 84L225 70C222 62 215 58 205 58H175L150 25C146 20 140 18 132 18H75C68 18 62 21 58 26L32 58H20C12 58 5 65 5 73V84C5 90 10 95 20 95Z"
                      fill="#065F5B"
                      stroke="#FFD60A"
                      strokeWidth="4"
                    />
                    <path
                      d="M60 48L72 75H120V45H68C64 45 61 46 60 48Z"
                      fill="#D8F0EE"
                      fillOpacity="0.8"
                    />
                    <path
                      d="M128 45V75H176L168 48C167 46 164 45 160 45H128Z"
                      fill="#D8F0EE"
                      fillOpacity="0.8"
                    />
                    <circle cx="65" cy="100" r="18" fill="#0F1B1B" stroke="#FFD60A" strokeWidth="4" />
                    <circle cx="175" cy="100" r="18" fill="#0F1B1B" stroke="#FFD60A" strokeWidth="4" />
                    <circle cx="65" cy="100" r="7" fill="#FFD60A" />
                    <circle cx="175" cy="100" r="7" fill="#FFD60A" />
                  </svg>
                  <p className="text-xs font-semibold text-signal-yellow mt-2">
                    Multi-Point Diagnostic Ready
                  </p>
                </div>

                {/* Floating Metric Pill */}
                <div className="bg-teal-950/80 rounded-2xl p-3 border border-teal-700/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-teal-300 text-[11px]">Avg. Service Time</p>
                    <p className="text-sm font-bold text-white font-mono">1.8 Hours</p>
                  </div>
                  <div className="text-right">
                    <p className="text-teal-300 text-[11px]">Customer Rating</p>
                    <p className="text-sm font-bold text-signal-yellow font-mono">4.9 / 5.0 ★</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Authorized Service Centers Section */}
      <section className="py-16 bg-slate-50 dark:bg-[#033030] border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-teal-700 dark:text-yellow-signal uppercase tracking-wider block">
                Maharashtra Network
              </span>
              <h2 className="text-3xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white mt-1">
                Featured Authorized Workshops
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Certified multi-bay service centers with guaranteed OEM parts and verified technicians
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/customer/centers')}
              icon={ArrowRight}
            >
              Explore All Centers
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCenters.map((fc) => (
              <Card
                key={fc.id}
                className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-xl transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-28 bg-gradient-to-tr from-teal-900 to-teal-700 p-4 flex flex-col justify-between text-white relative">
                    <span className="self-end px-2 py-0.5 rounded-full bg-yellow-signal text-ink text-[10px] font-bold">
                      {fc.avg_rating ? `${Number(fc.avg_rating).toFixed(1)} ★` : '4.9 ★'}
                    </span>
                    <div>
                      <span className="text-[10px] text-teal-300 font-bold uppercase block">
                        {fc.area}, {fc.city}
                      </span>
                      <h4 className="font-bold text-sm leading-tight text-white line-clamp-1">
                        {fc.name}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    <p className="text-slate-500 line-clamp-2 text-[11px]">
                      {fc.address || `${fc.area}, ${fc.city}`}
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{fc.working_hours || '09:00 - 18:00'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => {
                      sessionStorage.setItem('vscms_selected_center', JSON.stringify(fc));
                      navigate(`/customer/book?center_id=${fc.id}`);
                    }}
                    icon={ArrowRight}
                  >
                    <span>Book Service</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Register Center Modal */}
      <RegisterCenterModal
        isOpen={registerCenterOpen}
        onClose={() => setRegisterCenterOpen(false)}
      />

      {/* 3. TEAL BAND: 3 BENEFITS + COLLAGE */}
      <section id="benefits" className="py-20 bg-teal-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-signal-yellow uppercase tracking-wider">
              Why Choose VSCMS
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2">
              Quality Service You Can Count On
            </h2>
            <p className="text-sm sm:text-base text-teal-100 mt-3 leading-relaxed">
              We replaced opaque workshop markups with cloud status tracking and factory-spec precision.
            </p>
          </div>

          {/* 3 Core Benefit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-1">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-signal-yellow text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                    <DollarSign className="w-6 h-6 text-slate-950" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    1. Transparent Pricing
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every labour minute and replacement part is itemized upfront with standard GST calculation. No surprise bills or hidden costs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-teal-800 dark:text-signal-yellow font-semibold">
                <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-signal-yellow shrink-0" />
                <span>Full invoice download & breakdown</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-1">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-signal-yellow text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                    <Award className="w-6 h-6 text-slate-950" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    2. Certified Mechanics
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Dedicated specialists for engine diagnostics, brakes, and electricals. Assigned strictly based on vehicle needs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-teal-800 dark:text-signal-yellow font-semibold">
                <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-signal-yellow shrink-0" />
                <span>Trained on modern OBD standards</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-1">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-signal-yellow text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                    <Activity className="w-6 h-6 text-slate-950" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    3. Live Status Tracking
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Follow every stage from your screen: Booked, In Progress, Ready for Pickup, and Paid. Receive notifications as status updates.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-teal-800 dark:text-signal-yellow font-semibold">
                <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-signal-yellow shrink-0" />
                <span>Real-time status timeline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "HOW TO START IT?" - 4 STEPS ON DOTTED CONNECTOR LINE */}
      <section id="how-it-works" className="py-20 bg-slate-50 dark:bg-[#022828] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
              How It Works
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Book, diagnose, track, and roll out in four seamless steps.
            </p>
          </div>

          {/* 4 Steps on dotted line */}
          <div className="relative">
            {/* Horizontal dotted connector on desktop */}
            <div className="hidden lg:block absolute top-10 left-16 right-16">
              <DottedLine orientation="horizontal" className="border-teal-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-700 dark:border-signal-yellow flex items-center justify-center text-2xl font-bold text-teal-900 dark:text-signal-yellow shadow-sm mb-5">
                  1
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  Pick Vehicle & Slot
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter registration plate and pick your preferred hourly booking slot.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-700 dark:border-signal-yellow flex items-center justify-center text-2xl font-bold text-teal-900 dark:text-signal-yellow shadow-sm mb-5">
                  2
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  Select Services & Issues
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pick catalog packages and describe symptoms with voice or photos.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-700 dark:border-signal-yellow flex items-center justify-center text-2xl font-bold text-teal-900 dark:text-signal-yellow shadow-sm mb-5">
                  3
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  Certified Repair
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Mechanic performs inspection, logs genuine parts, and marks completion.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-700 dark:border-signal-yellow flex items-center justify-center text-2xl font-bold text-teal-900 dark:text-signal-yellow shadow-sm mb-5">
                  4
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  Review & Easy Pay
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pay securely via UPI, Card or Cash and download your itemized receipt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DOORSTEP PICK-UP & DELIVERY */}
      <section className="py-20 bg-white dark:bg-[#022828] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider">
              Convenient Vehicle Care
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
              Hassle-Free Doorstep Pick-up & Delivery
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              No need to leave your home or office. Schedule doorstep pickup, track live servicing, and get your vehicle returned fresh and ready.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Teal Doorstep Delivery Card */}
            <div className="lg:col-span-5 bg-teal-900 text-white rounded-3xl p-8 md:p-10 shadow-md flex flex-col justify-between border border-teal-800">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-signal-yellow text-slate-900 flex items-center justify-center font-bold mb-6">
                  <Truck className="w-6 h-6 text-slate-950" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Doorstep Pick-Up & Delivery
                </h3>
                <p className="text-sm text-teal-100 leading-relaxed mb-6">
                  Schedule a convenient valet pick-up right from your doorstep. Our verified drivers safely transit your vehicle to an authorized workshop bay and deliver it back post-service.
                </p>

                <div className="space-y-4 border-t border-teal-800 pt-6 text-xs text-teal-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-signal-yellow shrink-0" />
                    <span>Flexible Morning, Afternoon & Evening Slots</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-signal-yellow shrink-0" />
                    <span>100% Insured Valet Transit & Verified Drivers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-signal-yellow shrink-0" />
                    <span>Contactless Handover & Itemized Digital Receipts</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Button
                  variant="primary"
                  onClick={() => navigate('/login?tab=customer')}
                  className="w-full"
                >
                  Schedule Doorstep Pickup
                </Button>
              </div>
            </div>

            {/* How Doorstep Service Works - 4 Steps */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900/80 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider block mb-1.5">
                  How It Works
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Doorstep Service in 4 Simple Steps
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs mb-2.5">
                      1
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Book Online</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Select your vehicle, choose required service packages, and pick your preferred doorstep pickup slot.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs mb-2.5">
                      2
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Doorstep Valet</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      A verified valet driver arrives at your location for contactless handover and initial vehicle inspection.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs mb-2.5">
                      3
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Live Bay Tracking</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Track the diagnostic checks, spare parts installed, and work progress in real time from your portal.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs mb-2.5">
                      4
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Return Delivery</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Your serviced car is delivered back to your doorstep, complete with an itemized digital invoice.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-2 font-medium text-teal-800 dark:text-signal-yellow">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-signal-yellow" />
                  Doorstep pick-up & delivery available on all bookings
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section className="py-20 bg-slate-50 dark:bg-[#022828] transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider">
              Common Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion items={faqItems} allowMultiple={false} />
        </div>
      </section>
    </LandingLayout>
  );
}
