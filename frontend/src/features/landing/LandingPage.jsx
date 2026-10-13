import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wrench, ShieldCheck, Clock, CheckCircle2, DollarSign, Award,
  Activity, ArrowRight, Phone, Send, MapPin, Sparkles, AlertTriangle,
  Building2, Star, Search
} from 'lucide-react';
import { LandingLayout } from '../../app/layouts/LandingLayout';
import {
  Button, Input, Textarea, Card, Accordion, Carousel,
  Squiggle, Sparkle, DottedLine, NumberPlate
} from '../../shared/ui';
import { contactApi, centerApi } from '../../api';
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

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Quote calculator state
  const [quoteService, setQuoteService] = useState('General Service');
  const [quoteFuel, setQuoteFuel] = useState('Petrol');

  const quotePrices = {
    'General Service': { Petrol: 1999, Diesel: 2299, Electric: 1799 },
    'Oil Change': { Petrol: 899, Diesel: 1099, Electric: 599 },
    'Brake Repair': { Petrol: 1299, Diesel: 1399, Electric: 1299 },
    'AC Service': { Petrol: 1799, Diesel: 1799, Electric: 1699 },
  };

  const currentEstimatedQuote = (quotePrices[quoteService] && quotePrices[quoteService][quoteFuel]) || 1999;

  const handleQuickBook = (e) => {
    e.preventDefault();
    if (!quickPlate.trim()) {
      toast.error('Please enter your vehicle registration number');
      return;
    }
    const cleanPlate = quickPlate.replace(/\s+/g, '').toUpperCase();
    navigate(`/login?tab=customer&plate=${cleanPlate}`);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone || !contactForm.email || !contactForm.message) {
      toast.error('Please fill out all contact fields');
      return;
    }

    try {
      setContactSubmitting(true);
      await contactApi.submitMessage(contactForm);
      toast.success('Your message has been sent! Our service advisor will call you shortly.');
      setContactForm({ name: '', phone: '', email: '', message: '' });
    } catch {
      toast.error('Could not submit message. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Rajesh Kulkarni",
      role: "Verified Honda City Owner",
      rating: 5,
      content: "The live status tracker is a game changer! I watched my brake replacement progress from my office and approved genuine parts with clear pricing. No surprise calls.",
      vehicle: "Honda City 1.5 i-VTEC"
    },
    {
      id: 2,
      name: "Sneha Nair",
      role: "Hyundai Venue Commuter",
      rating: 5,
      content: "Booked an urgent slot when my AC stopped blowing cold air before a highway trip. Mechanics diagnosed the condenser leak, fixed it in 2 hours, and invoice was 100% itemized.",
      vehicle: "Hyundai Venue SX"
    },
    {
      id: 3,
      name: "Amit Patel",
      role: "Tata Nexon EV Owner",
      rating: 5,
      content: "Best auto workshop experience in Pune. Easy UPI payment gateway, genuine parts inventory proof, and free doorstep valet drop. Highly recommended!",
      vehicle: "Tata Nexon EV Max"
    },
    {
      id: 4,
      name: "Pooja Deshpande",
      role: "Mahindra XUV700 Driver",
      rating: 5,
      content: "The problem description audio recording made describing the squeaking noise super easy. The assigned mechanic addressed exactly what I reported.",
      vehicle: "Mahindra XUV700 AX7"
    }
  ];

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
            <Card className="bg-teal-950/60 border-teal-800 text-white p-7 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-signal-yellow text-slate-900 flex items-center justify-center font-bold mb-5">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  1. Transparent Pricing
                </h3>
                <p className="text-xs sm:text-sm text-teal-200 leading-relaxed">
                  Every labour minute and replacement part is itemized upfront with standard GST calculation. No surprise bills or hidden costs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-teal-800 text-xs text-signal-yellow font-medium">
                ✓ Full invoice download & breakdown
              </div>
            </Card>

            <Card className="bg-teal-950/60 border-teal-800 text-white p-7 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-signal-yellow text-slate-900 flex items-center justify-center font-bold mb-5">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  2. Certified Mechanics
                </h3>
                <p className="text-xs sm:text-sm text-teal-200 leading-relaxed">
                  Dedicated specialists for engine diagnostics, brakes, and electricals. Assigned strictly based on vehicle needs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-teal-800 text-xs text-signal-yellow font-medium">
                ✓ Trained on modern OBD standards
              </div>
            </Card>

            <Card className="bg-teal-950/60 border-teal-800 text-white p-7 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-signal-yellow text-slate-900 flex items-center justify-center font-bold mb-5">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  3. Live Status Tracking
                </h3>
                <p className="text-xs sm:text-sm text-teal-200 leading-relaxed">
                  Follow every stage from your screen: Booked, In Progress, Ready for Pickup, and Paid. Receive notifications as status updates.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-teal-800 text-xs text-signal-yellow font-medium">
                ✓ Real-time status timeline
              </div>
            </Card>
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

      {/* 5. CUSTOMER TESTIMONIALS CAROUSEL */}
      <section id="testimonials" className="py-20 bg-white dark:bg-[#022828] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider">
              Customer Reviews
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
              What Car Owners Say
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Over 1,200 vehicles serviced with a 4.9/5 star satisfaction score.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Carousel
              items={testimonials.map(item => (
                <div key={item.id} className="p-4">
                  <Card className="p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center">
                    {/* 5 Yellow Stars */}
                    <div className="flex items-center gap-1 text-signal-yellow mb-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} className="text-xl">★</span>
                      ))}
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed italic max-w-xl mb-6">
                      "{item.content}"
                    </p>
                    <div className="font-bold text-slate-900 dark:text-white text-base">
                      {item.name}
                    </div>
                    <div className="text-xs text-teal-700 dark:text-signal-yellow font-medium mt-0.5">
                      {item.vehicle} • {item.role}
                    </div>
                  </Card>
                </div>
              ))}
            />
          </div>
        </div>
      </section>

      {/* 6. "GET A QUOTE" TEAL CARD WITH PHONE MOCKUP */}
      <section className="py-20 bg-teal-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Calculator Form */}
            <div className="lg:col-span-7 bg-teal-950/60 p-8 sm:p-10 rounded-3xl border border-teal-800">
              <span className="text-xs font-bold text-signal-yellow uppercase tracking-wider">
                Instant Price Calculator
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4">
                Calculate Your Service Cost
              </h2>
              <p className="text-sm text-teal-100 mb-6">
                Transparent standard pricing with no hidden technician surcharges.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-teal-200 mb-1.5 block">
                    Select Package
                  </label>
                  <select
                    value={quoteService}
                    onChange={(e) => setQuoteService(e.target.value)}
                    className="w-full bg-teal-800/90 border border-teal-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="General Service">General Service (Comprehensive)</option>
                    <option value="Oil Change">Engine Oil Change</option>
                    <option value="Brake Repair">Brake Inspection & Repair</option>
                    <option value="AC Service">AC Service & Disinfection</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-teal-200 mb-1.5 block">
                    Fuel / Powertrain
                  </label>
                  <select
                    value={quoteFuel}
                    onChange={(e) => setQuoteFuel(e.target.value)}
                    className="w-full bg-teal-800/90 border border-teal-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric Vehicle (EV)</option>
                  </select>
                </div>
              </div>

              {/* Price Callout */}
              <div className="p-4 bg-teal-950/90 rounded-2xl border border-teal-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-teal-300 uppercase tracking-wider block">
                    Estimated Starting Price
                  </span>
                  <span className="text-3xl font-mono font-bold text-signal-yellow">
                    ₹{currentEstimatedQuote.toLocaleString('en-IN')}*
                  </span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => navigate('/login?tab=customer')}
                  size="md"
                >
                  Book This Service
                </Button>
              </div>
              <p className="text-[11px] text-teal-300 mt-2 italic">
                *Includes initial inspection and standard labour. 18% GST and extra replacement parts applied upon itemized completion.
              </p>
            </div>

            {/* Right Phone Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-64 h-[420px] bg-slate-950 rounded-[36px] border-4 border-slate-800 p-3 shadow-2xl relative flex flex-col justify-between">
                {/* Speaker pill */}
                <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto mb-2" />

                {/* Inner Screen */}
                <div className="flex-1 bg-slate-900 rounded-[24px] p-4 text-white flex flex-col justify-between overflow-hidden border border-slate-800">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>VSCMS Portal</span>
                      <span className="text-signal-yellow font-bold">● Active Job</span>
                    </div>

                    <div className="bg-teal-900/60 p-3 rounded-xl border border-teal-700">
                      <p className="text-[10px] text-teal-300">Vehicle</p>
                      <p className="text-xs font-bold text-white font-mono">MH12 AB 1234</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">Hyundai Creta SX</p>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80">
                        <span className="text-slate-400">Diagnostic</span>
                        <span className="text-emerald-400 font-bold">Passed</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80">
                        <span className="text-slate-400">Parts Used</span>
                        <span className="text-signal-yellow font-bold">2 Items</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80">
                        <span className="text-slate-400">Status</span>
                        <span className="text-teal-300 font-bold">In Progress</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-center">
                    <span className="text-[10px] text-signal-yellow font-bold uppercase tracking-wider">
                      Real-Time Updates
                    </span>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LOCATIONS: TEAL ADDRESS CARD + OPENSTREETMAP IFRAME (NO API KEY) */}
      <section className="py-20 bg-white dark:bg-[#022828] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider">
              Workshop Location
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
              Visit Our Service Center
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Equipped with modern diagnostic scanning tools and 9 hydraulic vehicle bays.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Teal Address Card */}
            <div className="lg:col-span-5 bg-teal-900 text-white rounded-3xl p-8 md:p-10 shadow-md flex flex-col justify-between border border-teal-800">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-signal-yellow text-slate-900 flex items-center justify-center font-bold mb-6">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Pune Central Workshop
                </h3>
                <p className="text-sm text-teal-100 leading-relaxed mb-6">
                  Plot 42, Auto Hub Way, Tech Industrial Park, Hinjawadi Phase 2, Pune, Maharashtra 411057
                </p>

                <div className="space-y-4 border-t border-teal-800 pt-6 text-xs text-teal-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-signal-yellow shrink-0" />
                    <span>Mon - Sat: 09:00 AM – 06:00 PM</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-signal-yellow shrink-0" />
                    <span>+91 98222 00000 / 1800-200-VSCMS</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-signal-yellow shrink-0" />
                    <span>Valet Pick-Up & Drop Within 25 KM Radius</span>
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

            {/* Embedded OpenStreetMap Iframe (No API Key Required!) */}
            <div className="lg:col-span-7 rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 min-h-[380px] bg-slate-100 dark:bg-slate-800">
              <iframe
                title="VSCMS Center Map Location"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '380px' }}
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=73.7144%2C18.5833%2C73.7544%2C18.6033&amp;layer=mapnik&amp;marker=18.5933%2C73.7344"
              />
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

      {/* 9. CONTACT FORM (WORKS, SAVES TO Contact_Message) */}
      <section id="contact" className="py-20 bg-white dark:bg-[#022828] transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 md:p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs font-bold text-teal-700 dark:text-signal-yellow uppercase tracking-wider">
                Direct Inquiry
              </span>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                Talk to Our Service Advisors
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
                Have a specialized request or question? Leave a note and we'll reply promptly.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Full Name"
                  placeholder="e.g. Your Full Name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Contact Phone (10 Digits)"
                  placeholder="e.g. 9822011223"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />

              <Textarea
                label="Message or Problem Details"
                placeholder="Tell us about your vehicle model and what service you are looking for..."
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                rows={4}
                required
              />

              <div className="pt-2 text-center">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={contactSubmitting}
                  icon={Send}
                  className="w-full sm:w-auto px-10"
                >
                  Send Inquiry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </LandingLayout>
  );
}
