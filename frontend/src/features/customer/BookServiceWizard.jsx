import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Car, Calendar, Clock, Wrench, AlertTriangle, Mic, MicOff,
  Check, Plus, ArrowRight, ArrowLeft, ShieldAlert, Sparkles, UploadCloud,
  CheckCircle2, DollarSign, MapPin, Building2, Star, AlertCircle, X,
  RefreshCw, Info
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Input, Select, Textarea,
  NumberPlate, FileDropzone, Badge, Modal
} from '../../shared/ui';
import { vehicleApi, centerApi, requestApi } from '../../api';
import { useAuth } from '../../app/context/AuthContext';

// Problem chips required by prompt
const PROBLEM_CHIPS = [
  { id: 'engine_noise', label: 'Engine noise', icon: '🔊', keyword: 'engine' },
  { id: 'brakes', label: 'Brakes', icon: '🛑', keyword: 'brake' },
  { id: 'battery', label: 'Battery', icon: '🔋', keyword: 'battery' },
  { id: 'ac', label: 'AC', icon: '❄️', keyword: 'ac' },
  { id: 'oil_leak', label: 'Oil leak', icon: '💧', keyword: 'oil' },
  { id: 'warning_light', label: 'Warning light', icon: '⚠️', keyword: 'diagnostic' },
  { id: 'overheating', label: 'Overheating', icon: '🌡️', keyword: 'coolant' },
  { id: 'steering_suspension', label: 'Steering/suspension', icon: '🚗', keyword: 'suspension' },
  { id: 'tyres', label: 'Tyres', icon: '🛞', keyword: 'tyre' },
  { id: 'gear_clutch', label: 'Gear/clutch', icon: '⚙️', keyword: 'clutch' },
  { id: 'electrical', label: 'Electrical', icon: '⚡', keyword: 'electrical' },
  { id: 'smell_smoke', label: 'Smell/smoke', icon: '💨', keyword: 'exhaust' },
  { id: 'routine_service', label: 'Routine service', icon: '🔧', keyword: 'service' }
];

const URGENCY_LEVELS = [
  { id: 'Routine', label: 'Routine (Within 1-2 weeks)', badge: 'teal' },
  { id: 'Soon', label: 'Soon (Within 2-3 days)', badge: 'yellow' },
  { id: 'Urgent', label: 'Urgent (Immediate attention)', badge: 'red' }
];

const PROBLEM_STARTED_OPTIONS = [
  'Today', 'Last 2-3 days', 'About a week ago', 'Over a month ago'
];

const PROBLEM_FREQUENCY_OPTIONS = [
  'Constantly (all the time)',
  'Intermittently (comes and goes)',
  'Only at high speeds',
  'Only when starting cold'
];

export function BookServiceWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userLocation } = useAuth();

  // Selected Center
  const centerIdParam = searchParams.get('center_id');
  const [center, setCenter] = useState(() => {
    try {
      const saved = sessionStorage.getItem('vscms_selected_center');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Stepper state (1: Vehicle & Slot, 2: Problem & Services, 3: Review)
  const [step, setStep] = useState(1);

  // Data collections
  const [vehicles, setVehicles] = useState([]);
  const [centerServices, setCenterServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Selected Parameters
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [slotCheckResult, setSlotCheckResult] = useState(null); // { available: true/false, alternates: [] }
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [slotUnavailableModalOpen, setSlotUnavailableModalOpen] = useState(false);

  // Problem / Services parameters
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedProblemChips, setSelectedProblemChips] = useState([]);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [problemDescription, setProblemDescription] = useState('');
  const [urgency, setUrgency] = useState('Routine');
  const [problemStarted, setProblemStarted] = useState('Last 2-3 days');
  const [problemFrequency, setProblemFrequency] = useState('Intermittently (comes and goes)');
  const [problemPhotos, setProblemPhotos] = useState([]);

  // Voice Web Speech
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Inline Vehicle Add Modal
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: 2022,
    fuel_type: 'Petrol',
    color: 'White'
  });
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Submitting Request
  const [submitting, setSubmitting] = useState(false);

  // Load Center details
  useEffect(() => {
    async function initCenter() {
      const targetCenterId = centerIdParam || center?.id;
      if (!targetCenterId) {
        toast.error('Please choose a service center first');
        navigate('/customer/centers', { replace: true });
        return;
      }

      try {
        setLoading(true);
        const centerRes = await centerApi.getCenterDetails(targetCenterId);
        const currentCenter = centerRes.center;
        setCenter(currentCenter);
        sessionStorage.setItem('vscms_selected_center', JSON.stringify(currentCenter));

        // Center catalog services
        setCenterServices(centerRes.services || []);

        // Load vehicles
        const vRes = await vehicleApi.list();
        const vList = vRes.vehicles || [];
        setVehicles(vList);

        const plateParam = searchParams.get('plate');
        if (plateParam && vList.length > 0) {
          const match = vList.find(v => v.Registration_Number === plateParam.toUpperCase());
          if (match) setSelectedVehicleId(match.Vehicle_ID);
        } else if (vList.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(vList[0].Vehicle_ID);
        }
      } catch (err) {
        toast.error('Failed to load center details');
        navigate('/customer/centers');
      } finally {
        setLoading(false);
      }
    }

    initCenter();

    // Voice recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setProblemDescription(prev => (prev ? `${prev} ${text}` : text));
        setIsRecording(false);
        toast.success('Voice transcribed!');
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [centerIdParam]);

  // Fetch slots for center and date
  useEffect(() => {
    const targetCenterId = center?.id || centerIdParam;
    if (!targetCenterId || !selectedDate) return;

    async function loadSlots() {
      try {
        setSlotsLoading(true);
        const res = await centerApi.getCenterSlots(targetCenterId, selectedDate);
        const slotList = res.slots || [];
        setSlots(slotList);

        // Reset selected slot unless still present
        if (selectedSlotId) {
          const stillThere = slotList.find(s => s.id === selectedSlotId || s.Slot_ID === selectedSlotId);
          if (!stillThere) {
            setSelectedSlotId(null);
            setSlotCheckResult(null);
          }
        }
      } catch {
        toast.error('Failed to fetch appointment slots');
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots();
  }, [center?.id, centerIdParam, selectedDate]);

  // Handle slot click + server availability check
  const handleSelectSlot = async (slot) => {
    const sId = slot.id || slot.Slot_ID;
    const targetCenterId = center?.id || centerIdParam;

    try {
      setCheckingSlot(true);
      setSelectedSlotId(sId);
      const res = await centerApi.checkSlotAvailability(targetCenterId, sId);
      setSlotCheckResult(res);

      if (res.available) {
        toast.success(`Slot reserved (${slot.start_time || slot.Start_Time} - ${slot.end_time || slot.End_Time})`);
      } else {
        // Slot is full!
        setSlotUnavailableModalOpen(true);
      }
    } catch (err) {
      toast.error('Error validating slot availability');
    } finally {
      setCheckingSlot(false);
    }
  };

  // Toggle problem chip and auto-suggest matching center services
  const handleToggleProblemChip = (chip) => {
    const isAlready = selectedProblemChips.includes(chip.id);
    let nextChips = [];
    if (isAlready) {
      nextChips = selectedProblemChips.filter(id => id !== chip.id);
    } else {
      nextChips = [...selectedProblemChips, chip.id];
      // Auto-suggest matching service
      const matchedService = centerServices.find(s =>
        s.name.toLowerCase().includes(chip.keyword) ||
        (s.description && s.description.toLowerCase().includes(chip.keyword))
      );
      if (matchedService && !selectedServiceIds.includes(matchedService.service_id)) {
        setSelectedServiceIds(prev => [...prev, matchedService.service_id]);
        toast.success(`Auto-suggested: ${matchedService.name}`, { icon: '✨' });
      }
    }
    setSelectedProblemChips(nextChips);
  };

  // Toggle service selection
  const handleToggleService = (serviceId) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(prev => prev.filter(id => id !== serviceId));
    } else {
      setSelectedServiceIds(prev => [...prev, serviceId]);
    }
  };

  // Voice toggle
  const handleToggleVoice = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast('Listening to your problem description...', { icon: '🎙️' });
      } catch {
        setIsRecording(false);
      }
    }
  };

  // Inline vehicle addition
  const handleAddInlineVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.registration_number?.trim() || !newVehicle.make?.trim() || !newVehicle.model?.trim()) {
      toast.error('Please enter registration plate, make, and model');
      return;
    }
    try {
      setAddingVehicle(true);
      const res = await vehicleApi.add({
        registration_number: newVehicle.registration_number.toUpperCase().trim(),
        make: newVehicle.make.trim(),
        model: newVehicle.model.trim(),
        year: Number(newVehicle.year) || 2022,
        fuel_type: newVehicle.fuel_type || 'Diesel',
        color: newVehicle.color || 'Classic White'
      });
      const created = res.vehicle;
      if (created) {
        setVehicles(prev => [...prev.filter(v => v.Vehicle_ID !== created.Vehicle_ID), created]);
        setSelectedVehicleId(created.Vehicle_ID);
      }
      setShowAddVehicleModal(false);
      setNewVehicle({
        registration_number: '',
        make: '',
        model: '',
        year: 2022,
        fuel_type: 'Diesel',
        color: 'Classic White'
      });
      toast.success('Vehicle registered and selected!');
    } catch (err) {
      console.error('Error adding vehicle:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to add vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  // Step 1 -> Step 2 validation
  const handleProceedToProblem = () => {
    if (!selectedVehicleId) {
      toast.error('Please choose or register a vehicle');
      return;
    }
    if (!selectedSlotId) {
      toast.error('Please choose an appointment slot');
      return;
    }
    if (!slotCheckResult?.available) {
      toast.error('Selected slot is not confirmed available. Please pick another slot.');
      return;
    }
    setStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleProceedToReview = () => {
    const hasServiceOrProblem = selectedServiceIds.length > 0 || selectedProblemChips.length > 0;
    
    // If "Other" is chosen, free-text description is REQUIRED (min 10 chars)
    if (isOtherSelected) {
      if (!problemDescription || problemDescription.trim().length < 10) {
        toast.error('Because you selected "Other", please describe your problem (minimum 10 characters).');
        return;
      }
    } else if (!hasServiceOrProblem && (!problemDescription || problemDescription.trim().length < 5)) {
      toast.error('Please select at least one service, problem chip, or describe your issue.');
      return;
    }

    setStep(3);
  };

  // Step 3 -> Final Submit
  const handleConfirmBooking = async () => {
    if (!selectedVehicleId || !selectedSlotId || !center?.id) {
      toast.error('Required booking details are incomplete');
      return;
    }

    try {
      setSubmitting(true);
      const bookingPayload = {
        center_id: center.id,
        vehicle_id: selectedVehicleId,
        slot_id: selectedSlotId,
        service_ids: selectedServiceIds,
        problem_description: problemDescription,
        problem_categories: selectedProblemChips,
        urgency: urgency,
        problem_started: problemStarted,
        problem_frequency: problemFrequency
      };

      const res = await requestApi.book(bookingPayload);
      const createdReq = res.request;
      const reqId = createdReq?.id || createdReq?.Request_ID;

      // Upload photos if any
      if (problemPhotos.length > 0 && reqId) {
        const formData = new FormData();
        for (let photo of problemPhotos) {
          formData.append('images', photo);
        }
        try {
          await requestApi.uploadAttachments(reqId, formData);
        } catch {
          // Non-blocking attachment failure
        }
      }

      toast.success(`Appointment request submitted! Request #${reqId} is Pending Approval.`);
      sessionStorage.removeItem('vscms_selected_center');
      navigate(`/dashboard/bookings`);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'SLOT_FULL') {
        toast.error('Slot was just booked by another customer. Please choose an alternate slot.');
        setStep(1);
        setSlotUnavailableModalOpen(true);
      } else {
        toast.error(errData?.error || 'Failed to submit appointment request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Derived Review Entities
  const selectedVehicle = vehicles.find(v => v.Vehicle_ID === selectedVehicleId);
  const selectedServicesObjects = centerServices.filter(s => selectedServiceIds.includes(s.service_id));
  const selectedSlot = slots.find(s => (s.id === selectedSlotId || s.Slot_ID === selectedSlotId));
  const estimatedMin = selectedServicesObjects.reduce((acc, s) => acc + (s.price || 0), 0);
  const estimatedMax = Math.round(estimatedMin * 1.25);

  return (
    <DashboardLayout
      title="Book Service Appointment"
      subtitle="Complete your booking with verified local technicians"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Persistent Summary Panel (Center & Location) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-900 text-yellow-signal flex items-center justify-center font-bold text-lg shrink-0 shadow">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-yellow-signal">
                  Selected Service Center
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  Verified Center
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {center?.name || 'Selected Workshop'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>{center?.address || `${center?.area}, ${center?.city}`}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{center?.working_hours || '09:00 - 18:00'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{center?.avg_rating ? `${Number(center.avg_rating).toFixed(1)}/5.0` : 'New'}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {centerServices.length} Services Offered
              </p>
            </div>
            <Link
              to="/customer/centers"
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
            >
              Change Center
            </Link>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xl mx-auto">
          <button
            onClick={() => setStep(1)}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              step === 1 ? 'bg-yellow-signal text-ink shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            1. Vehicle & Slot
          </button>
          <button
            onClick={() => {
              if (selectedVehicleId && selectedSlotId && slotCheckResult?.available) setStep(2);
            }}
            disabled={!selectedSlotId || !slotCheckResult?.available}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              step === 2
                ? 'bg-yellow-signal text-ink shadow-sm'
                : 'text-slate-500 hover:text-slate-900 disabled:opacity-40'
            }`}
          >
            2. Problem & Services
          </button>
          <button
            onClick={() => {
              if (selectedVehicleId && selectedSlotId && slotCheckResult?.available) setStep(3);
            }}
            disabled={step < 2}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              step === 3
                ? 'bg-yellow-signal text-ink shadow-sm'
                : 'text-slate-500 hover:text-slate-900 disabled:opacity-40'
            }`}
          >
            3. Review & Submit
          </button>
        </div>

        {/* ============================================================ */}
        {/* STEP 1: VEHICLE + SLOT AT THIS CENTER */}
        {/* ============================================================ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Vehicle Selection */}
            <Card className="p-6 md:p-8 space-y-6 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white">
                    1. Choose Your Vehicle
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select a registered vehicle or add one inline
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddVehicleModal(true)}
                  icon={Plus}
                >
                  Add New Vehicle
                </Button>
              </div>

              {vehicles.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Car className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No vehicles found in your garage profile
                  </p>
                  <Button
                    variant="primary"
                    className="mt-3"
                    onClick={() => setShowAddVehicleModal(true)}
                  >
                    Add Vehicle Inline
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {vehicles.map((v) => {
                    const isSelected = selectedVehicleId === v.Vehicle_ID;
                    return (
                      <div
                        key={v.Vehicle_ID}
                        onClick={() => setSelectedVehicleId(v.Vehicle_ID)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-yellow-signal bg-yellow-tint/30 dark:bg-yellow-signal/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-teal-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <NumberPlate registrationNumber={v.Registration_Number} size="sm" />
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-yellow-signal" />
                          )}
                        </div>
                        <div className="mt-3">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {v.Make} {v.Model}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {v.Year} • {v.Fuel_Type}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Date + Slot Selection */}
            <Card className="p-6 md:p-8 space-y-6 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white">
                  2. Choose Appointment Date & Slot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Slots belong to this center ({center?.name}). Real-time availability check is performed on selection.
                </p>
              </div>

              {/* Date Input */}
              <div className="max-w-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Appointment Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlotId(null);
                    setSlotCheckResult(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Slots Grid */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Available Slots for {selectedDate}
                </label>

                {slotsLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Checking slot calendar...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                    No time slots configured for this center on {selectedDate}. Please select another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {slots.map((s) => {
                      const slotId = s.id || s.Slot_ID;
                      const isSelected = selectedSlotId === slotId;
                      const startTime = s.start_time || s.Start_Time;
                      const endTime = s.end_time || s.End_Time;
                      const capacity = s.capacity ?? s.Capacity ?? 3;
                      const booked = s.booked_count ?? s.Booked_Count ?? 0;
                      const left = Math.max(0, capacity - booked);
                      const isFull = left === 0;

                      return (
                        <button
                          key={slotId}
                          type="button"
                          onClick={() => handleSelectSlot(s)}
                          disabled={checkingSlot}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                            isSelected && slotCheckResult?.available
                              ? 'border-yellow-signal bg-yellow-signal/15 shadow-sm ring-2 ring-yellow-signal'
                              : isFull
                              ? 'border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 opacity-80'
                              : 'border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                            <span>{startTime} - {endTime}</span>
                            {isSelected && slotCheckResult?.available && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <span className={`text-[11px] font-semibold block ${
                            isFull ? 'text-rose-600 font-bold' : 'text-teal-700 dark:text-yellow-signal'
                          }`}>
                            {isFull ? '● Full' : `${left} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Verified Slot Status Banner */}
              {selectedSlotId && slotCheckResult?.available && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Slot verified and held: {selectedDate} ({selectedSlot?.start_time || selectedSlot?.Start_Time} - {selectedSlot?.end_time || selectedSlot?.End_Time})</span>
                  </div>
                </div>
              )}

              {/* Proceed Action */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!selectedVehicleId || !selectedSlotId || !slotCheckResult?.available}
                  onClick={handleProceedToProblem}
                  icon={ArrowRight}
                >
                  Continue to Problem Description
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: WHAT IS THE PROBLEM / SERVICES */}
        {/* ============================================================ */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="p-6 md:p-8 space-y-6 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white">
                  What is the problem or service needed?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pick common problem symptoms or choose standard services offered by {center?.name}
                </p>
              </div>

              {/* Problem Chips (Required Set) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Select Symptoms / Issues (Auto-suggests matching services)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {PROBLEM_CHIPS.map((chip) => {
                    const isSelected = selectedProblemChips.includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleToggleProblemChip(chip)}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-yellow-signal text-ink border-yellow-signal shadow-sm font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500'
                        }`}
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center's Catalog Services */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Services Offered by this Center ({selectedServiceIds.length} Selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  {centerServices.map((s) => {
                    const isSelected = selectedServiceIds.includes(s.service_id);
                    return (
                      <div
                        key={s.service_id}
                        onClick={() => handleToggleService(s.service_id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-yellow-signal bg-yellow-tint/30 dark:bg-yellow-signal/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <div className="pr-2">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{s.name}</h4>
                          <p className="text-[11px] text-slate-500">Est. {s.estimated_hours || 1.5} hrs</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-teal-800 dark:text-yellow-signal">
                            ₹{s.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other / Custom Problem Toggle */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOtherSelected}
                    onChange={(e) => setIsOtherSelected(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Other / My problem is not in the list (Description becomes required)
                  </span>
                </label>
              </div>

              {/* Problem Description & Voice */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Describe your problem {isOtherSelected ? '(Required, min 10 characters)' : '(Optional)'}
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                        isRecording
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isRecording ? 'Listening...' : 'Voice Input'}</span>
                    </button>
                  )}
                </div>

                <Textarea
                  rows={3}
                  maxLength={1000}
                  placeholder={
                    isOtherSelected
                      ? 'Please describe your vehicle problem in detail (minimum 10 characters)...'
                      : 'Add any specific symptoms, dashboard warnings, or mechanic instructions...'
                  }
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {problemDescription.length} / 1000 characters
                </span>
              </div>

              {/* Urgency, Started, Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {URGENCY_LEVELS.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    When did it start?
                  </label>
                  <select
                    value={problemStarted}
                    onChange={(e) => setProblemStarted(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {PROBLEM_STARTED_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    How often?
                  </label>
                  <select
                    value={problemFrequency}
                    onChange={(e) => setProblemFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {PROBLEM_FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photos Dropzone (Max 3) */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Attach Problem Photos (Max 3, Optional)
                </label>
                <FileDropzone
                  files={problemPhotos}
                  onFilesChange={setProblemPhotos}
                  maxFiles={3}
                />
              </div>

              {/* Stepper Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setStep(1)} icon={ArrowLeft}>
                  Back
                </Button>
                <Button variant="primary" size="lg" onClick={handleProceedToReview} icon={ArrowRight}>
                  Review Summary
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: REVIEW & SEND APPOINTMENT REQUEST */}
        {/* ============================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-6 md:p-8 space-y-6 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-bold font-display uppercase tracking-wide text-slate-900 dark:text-white">
                  Review Appointment Request
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please verify all details before submitting. Your request will be created with status "Pending Approval" and your slot will be held.
                </p>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Center & Location */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Workshop & Location
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{center?.name}</h4>
                  <p className="text-xs text-slate-500">{center?.address}</p>
                  <p className="text-xs text-slate-500">{center?.phone} • {center?.working_hours}</p>
                </div>

                {/* Vehicle & Slot */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vehicle & Slot
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedVehicle?.Make} {selectedVehicle?.Model} ({selectedVehicle?.Registration_Number})
                  </h4>
                  <p className="text-xs text-slate-500">Date: {selectedDate}</p>
                  <p className="text-xs text-slate-500">
                    Time Window: {selectedSlot?.start_time || selectedSlot?.Start_Time} - {selectedSlot?.end_time || selectedSlot?.End_Time}
                  </p>
                </div>
              </div>

              {/* Selected Services & Problem Issues */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Services & Problem Scope
                </span>

                {selectedServicesObjects.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Selected Services:</span>
                    {selectedServicesObjects.map((s) => (
                      <div key={s.service_id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                        <span>{s.name}</span>
                        <span className="font-bold">₹{s.price}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedProblemChips.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Reported Symptoms:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProblemChips.map(id => {
                        const chip = PROBLEM_CHIPS.find(c => c.id === id);
                        return (
                          <Badge key={id} variant="teal">
                            {chip ? chip.label : id}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {problemDescription && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                    <span className="font-semibold block text-slate-700 dark:text-slate-200">Customer Description:</span>
                    <p className="italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 mt-1">
                      "{problemDescription}"
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500">Urgency: <strong className="text-slate-900 dark:text-white">{urgency}</strong></span>
                  <span className="text-slate-500">Photos attached: <strong className="text-slate-900 dark:text-white">{problemPhotos.length}</strong></span>
                </div>
              </div>

              {/* Price Estimate */}
              <div className="p-4 rounded-2xl bg-yellow-tint/40 dark:bg-yellow-signal/10 border border-yellow-signal/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Estimated Workshop Price Range
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exact invoice calculated after mechanic diagnosis and parts usage
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-teal-900 dark:text-yellow-signal">
                    ₹{estimatedMin} - ₹{estimatedMax || estimatedMin + 500}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setStep(2)} icon={ArrowLeft}>
                  Back to Problems
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  onClick={handleConfirmBooking}
                  icon={CheckCircle2}
                >
                  Send Appointment Request
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================ */}
        {/* SLOT UNAVAILABLE MODAL (Required by Step 3) */}
        {/* ============================================================ */}
        {slotUnavailableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                This slot is no longer available.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                The selected time window at {center?.name} is fully booked or was just taken by another customer. Please choose an alternate slot at this center or explore other authorized workshops.
              </p>

              {/* Suggested Alternate Slots (Up to 3) */}
              {slotCheckResult?.alternates && slotCheckResult.alternates.length > 0 && (
                <div className="mb-6 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-yellow-signal block">
                    Suggested Alternate Slots:
                  </span>
                  <div className="space-y-1.5">
                    {slotCheckResult.alternates.slice(0, 3).map((alt) => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(alt.date);
                          setSelectedSlotId(alt.id);
                          setSlotCheckResult({ available: true });
                          setSlotUnavailableModalOpen(false);
                          toast.success(`Selected alternate slot: ${alt.date} (${alt.time_window})`);
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 bg-slate-50 dark:bg-slate-800/80 text-left text-xs font-semibold flex items-center justify-between group transition"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>{alt.date} ({alt.time_window})</span>
                        </div>
                        <span className="text-[11px] text-teal-600 group-hover:underline">Pick Slot</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="space-y-2.5">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setSlotUnavailableModalOpen(false)}
                >
                  Choose another slot
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSlotUnavailableModalOpen(false);
                    navigate('/customer/centers');
                  }}
                >
                  Choose another service center
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* INLINE VEHICLE ADD MODAL */}
        {/* ============================================================ */}
        {showAddVehicleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Register New Vehicle
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Add your vehicle details inline without losing your booking progress
              </p>

              <form onSubmit={handleAddInlineVehicle} className="space-y-4">
                <Input
                  label="Registration Number Plate"
                  placeholder="e.g. MH 12 AB 1234"
                  value={newVehicle.registration_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registration_number: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Make (Brand)"
                    placeholder="e.g. Honda"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    required
                  />
                  <Input
                    label="Model"
                    placeholder="e.g. City"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Year"
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    required
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Fuel Type
                    </label>
                    <select
                      value={newVehicle.fuel_type}
                      onChange={(e) => setNewVehicle({ ...newVehicle, fuel_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="CNG">CNG</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setShowAddVehicleModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isLoading={addingVehicle}>
                    Save & Select Vehicle
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
