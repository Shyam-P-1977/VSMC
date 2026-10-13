import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, User, Wrench, AlertTriangle, CheckCircle2,
  XCircle, Filter, Search, Eye, UserPlus, ChevronRight, FileText,
  Image as ImageIcon, Check, X, ShieldAlert, Phone, AlertCircle,
  Copy, CheckCheck, Building2, MapPin
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, StatusBadge, Drawer, Modal,
  Input, Select, NumberPlate, Skeleton, Timeline, Textarea
} from '../../shared/ui';
import { requestApi, mechanicApi, centerApi } from '../../api';

const REJECTION_REASONS = [
  'Slot not available',
  'Service not offered',
  'Parts unavailable',
  'Fully booked',
  'Other'
];

export function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending Approval'); // Default to Appointment Requests
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [center, setCenter] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Selected Booking Details
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Mechanic Assignment Drawer
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [availableMechanics, setAvailableMechanics] = useState([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReasonCategory, setRejectReasonCategory] = useState('Slot not available');
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Accept Action Loading
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    centerApi.getCenterProfile()
      .then(res => { if (res.center) setCenter(res.center); })
      .catch(() => {});
  }, []);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Service Center Code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (urgencyFilter) params.urgency = urgencyFilter;
      const res = await requestApi.list(params);
      let list = res.requests || [];

      // If viewing Pending Approval, sort urgent first!
      if (statusFilter === 'Pending Approval') {
        const urgencyWeight = { 'Urgent': 3, 'Soon': 2, 'Routine': 1 };
        list.sort((a, b) => (urgencyWeight[b.Urgency] || 1) - (urgencyWeight[a.Urgency] || 1));
      }

      setBookings(list);
    } catch {
      toast.error('Failed to load workshop bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, urgencyFilter]);

  // Fetch Center Mechanics
  const fetchMechanics = async () => {
    try {
      const res = await centerApi.getCenterMechanics();
      setAvailableMechanics(res.mechanics || []);
    } catch {
      // Fallback
      try {
        const fallback = await mechanicApi.getAvailable();
        setAvailableMechanics(fallback.mechanics || []);
      } catch {
        toast.error('Could not load workshop mechanics');
      }
    }
  };

  // Open Detail
  const handleOpenDetail = async (booking) => {
    try {
      const bId = booking.Request_ID || booking.id;
      const res = await requestApi.getById(bId);
      setSelectedBooking(res.request);
      setDetailDrawerOpen(true);
    } catch {
      toast.error('Could not load booking details');
    }
  };

  // ACCEPT Workflow
  const handleAcceptBooking = async (booking) => {
    const bId = booking.Request_ID || booking.id;
    try {
      setAcceptingId(bId);
      await requestApi.accept(bId);
      toast.success(`Booking #${bId} ACCEPTED! Slot confirmed and customer notified.`);
      fetchBookings();
      if (detailDrawerOpen && selectedBooking) {
        const updated = await requestApi.getById(bId);
        setSelectedBooking(updated.request);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept booking');
    } finally {
      setAcceptingId(null);
    }
  };

  // REJECT Workflow
  const handleOpenRejectModal = (booking) => {
    setSelectedBooking(booking);
    setRejectReasonCategory('Slot not available');
    setRejectReasonText('Selected slot is no longer available at our workshop.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const bId = selectedBooking.Request_ID || selectedBooking.id;

    if (!rejectReasonText || rejectReasonText.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters long');
      return;
    }

    try {
      setRejecting(true);
      await requestApi.reject(bId, rejectReasonText.trim(), rejectReasonCategory);
      toast.success(`Booking #${bId} declined. Slot released and customer notified with reason.`);
      setRejectModalOpen(false);
      setDetailDrawerOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject booking');
    } finally {
      setRejecting(false);
    }
  };

  // ASSIGN MECHANIC Workflow
  const handleOpenAssignDrawer = async (booking) => {
    setSelectedBooking(booking);
    setSelectedMechanicId(null);
    await fetchMechanics();
    setAssignDrawerOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedBooking || !selectedMechanicId) {
      toast.error('Please choose a mechanic to assign');
      return;
    }
    const bId = selectedBooking.Request_ID || selectedBooking.id;

    try {
      setAssigning(true);
      await requestApi.assign(bId, selectedMechanicId);
      toast.success(`Mechanic assigned to Order #${bId}. Mechanic and customer notified!`);
      setAssignDrawerOpen(false);
      fetchBookings();
      if (detailDrawerOpen && selectedBooking) {
        const updated = await requestApi.getById(bId);
        setSelectedBooking(updated.request);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Mechanic assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    const cName = b.Customer?.Name || b.customer?.name || '';
    const plate = b.Vehicle?.Registration_Number || b.vehicle?.plate || '';
    const id = String(b.Request_ID || b.id);
    return cName.toLowerCase().includes(q) || plate.toLowerCase().includes(q) || id.includes(q);
  });

  const statusTabs = [
    { label: 'Pending Approval', value: 'Pending Approval', badge: 'Requests' },
    { label: 'Accepted', value: 'Accepted' },
    { label: 'Assigned', value: 'Assigned' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Cancelled', value: 'Cancelled' },
    { label: 'All', value: 'ALL' }
  ];

  return (
    <DashboardLayout
      title="Appointment Requests & Work Orders"
      subtitle="Review customer requests, accept or reject slots, and dispatch verified technicians"
    >
      <div className="space-y-6">
        {/* Service Center Identification & Code Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900 to-teal-800 text-white shadow-md border border-teal-700/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-yellow-signal text-teal-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-lg text-white">
                  {center?.name || 'Authorized Service Center'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {center?.approval_status || 'Approved'}
                </span>
              </div>
              <p className="text-xs text-teal-200">
                {center?.city ? `${center.city}, ${center.area || ''}` : 'Operational Workshop'} • Share code below with mechanics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/15 self-start sm:self-auto">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-200">
              CENTER CODE:
            </span>
            <span className="font-mono text-base font-black text-yellow-signal tracking-wider">
              {center?.center_code || 'VSC-PUN-E314'}
            </span>
            <button
              type="button"
              onClick={() => handleCopyCode(center?.center_code || 'VSC-PUN-E314')}
              className="p-1.5 rounded-lg bg-yellow-signal hover:bg-yellow-400 text-teal-950 text-xs font-bold transition-transform active:scale-95 cursor-pointer ml-1"
              title="Copy Center Code"
            >
              {copiedCode ? <CheckCheck className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Top Filter Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-fit">
            {statusTabs.map(tab => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.label}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-900 text-white shadow-sm dark:bg-yellow-signal dark:text-ink font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, plates, customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <select
              value={urgencyFilter}
              onChange={e => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All Urgencies</option>
              <option value="Urgent">Urgent</option>
              <option value="Soon">Soon</option>
              <option value="Routine">Routine</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              No appointments found under "{statusFilter}"
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Select another status filter or clear search terms to view other orders.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => {
              const bId = b.Request_ID || b.id;
              const isPending = b.Status === 'Pending Approval';
              const isAccepted = b.Status === 'Accepted';
              const isUrgent = b.Urgency === 'Urgent';

              return (
                <Card
                  key={bId}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        #{bId}
                      </span>
                      <StatusBadge status={b.Status} />
                      {isUrgent && (
                        <Badge variant="rose" size="sm">Urgent Attention</Badge>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        Requested: {b.Created_At ? new Date(b.Created_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {b.Customer?.Name || b.customer?.name || 'Customer'}
                      </h4>
                      <span className="text-xs text-slate-500">
                        ({b.Customer?.Phone || b.Customer?.Email || b.customer?.phone || 'No phone'})
                      </span>
                      {b.Vehicle && (
                        <NumberPlate registrationNumber={b.Vehicle.Registration_Number} size="sm" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-teal-800 dark:text-yellow-signal">
                        Slot: {b.Slot?.Date || b.slot?.Date} ({b.Slot?.Start_Time || b.slot?.start_time} - {b.Slot?.End_Time || b.slot?.end_time})
                      </span>
                      <span>•</span>
                      <span>Vehicle: {b.Vehicle?.Make} {b.Vehicle?.Model}</span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                      {b.Problem_Description || "Regular scheduled servicing"}
                    </p>
                  </div>

                  {/* Quick Center Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Pending Approval actions: ACCEPT or REJECT */}
                    {isPending && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={acceptingId === bId}
                          onClick={() => handleAcceptBooking(b)}
                          icon={Check}
                        >
                          Accept Slot
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50"
                          onClick={() => handleOpenRejectModal(b)}
                          icon={X}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Accepted actions: ASSIGN MECHANIC */}
                    {isAccepted && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenAssignDrawer(b)}
                        icon={UserPlus}
                      >
                        Assign Mechanic
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(b)}
                      icon={Eye}
                    >
                      Inspect
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* REJECT MODAL (Mandatory Reason with Dropdown & Min 10 Chars) */}
      {/* ============================================================ */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        maxWidth="max-w-md"
        title="Decline Appointment Request"
        subtitle="Specify workshop reason to release slot and notify customer"
      >
        {selectedBooking && (
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
              <p className="font-semibold">
                Order #{selectedBooking.Request_ID || selectedBooking.id} • {selectedBooking.Customer?.Name || 'Customer'}
              </p>
              <p className="text-[11px] mt-0.5 text-rose-700 dark:text-rose-400">
                Vehicle: {selectedBooking.Vehicle?.Make} {selectedBooking.Vehicle?.Model} ({selectedBooking.Vehicle?.Registration_Number})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Reason Category
              </label>
              <select
                value={rejectReasonCategory}
                onChange={(e) => {
                  setRejectReasonCategory(e.target.value);
                  if (e.target.value === 'Parts unavailable') {
                    setRejectReasonText('Required OEM replacement parts are currently out of stock.');
                  } else if (e.target.value === 'Fully booked') {
                    setRejectReasonText('Workshop capacity is completely full for this time window.');
                  } else if (e.target.value === 'Service not offered') {
                    setRejectReasonText('Requested specialized service is currently not offered at this workshop.');
                  }
                }}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {REJECTION_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Detailed Reason to Customer (Required, min 10 characters)
              </label>
              <Textarea
                rows={3}
                placeholder="Explain clearly to the customer why this request cannot be fulfilled..."
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-400 block text-right mt-1">
                {rejectReasonText.length} characters (min 10)
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                isLoading={rejecting}
                disabled={rejectReasonText.trim().length < 10}
              >
                Confirm Rejection & Release Slot
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* ASSIGN MECHANIC DRAWER */}
      {/* ============================================================ */}
      <Drawer
        isOpen={assignDrawerOpen}
        onClose={() => setAssignDrawerOpen(false)}
        title="Dispatch Workshop Mechanic"
        subtitle="Assign an active certified technician from your workshop roster"
      >
        {selectedBooking && (
          <div className="space-y-6 text-xs">
            {/* Order Brief */}
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
              <span className="text-[10px] font-bold uppercase text-teal-800 dark:text-yellow-signal block">
                Work Order #{selectedBooking.Request_ID || selectedBooking.id}
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {selectedBooking.Vehicle?.Make} {selectedBooking.Vehicle?.Model} ({selectedBooking.Vehicle?.Registration_Number})
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Slot: {selectedBooking.Slot?.Date} ({selectedBooking.Slot?.Start_Time} - {selectedBooking.Slot?.End_Time})
              </p>
            </div>

            {/* Mechanics Roster */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                Available Center Technicians ({availableMechanics.length})
              </span>

              {availableMechanics.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
                  No active mechanics found for this center.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {availableMechanics.map(m => {
                    const mId = m.id || m.Mechanic_ID;
                    const isSelected = selectedMechanicId === mId;
                    const load = m.current_load ?? m.Current_Load ?? 0;

                    return (
                      <div
                        key={mId}
                        onClick={() => setSelectedMechanicId(mId)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-yellow-signal bg-yellow-signal/15 shadow-sm ring-2 ring-yellow-signal'
                            : 'border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-teal-900 text-yellow-signal font-bold flex items-center justify-center text-sm">
                            {m.name?.charAt(0) || m.Name?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white">
                              {m.name || m.Name}
                            </h5>
                            <p className="text-slate-500 text-[11px]">
                              {m.specialization || m.Specialization || 'General Technician'} • {m.experience || '5+ yrs'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                            {load} Active Jobs
                          </span>
                          <span className="text-[11px] font-bold text-teal-700 dark:text-yellow-signal">
                            {isSelected ? '✓ Selected' : 'Choose'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setAssignDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!selectedMechanicId}
                isLoading={assigning}
                onClick={handleConfirmAssign}
              >
                Confirm Mechanic Assignment
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================ */}
      {/* DETAIL INSPECTION DRAWER */}
      {/* ============================================================ */}
      <Drawer
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        title={selectedBooking ? `Work Order #${selectedBooking.Request_ID || selectedBooking.id}` : "Order Inspection"}
        subtitle="Complete details and customer diagnostic notes"
      >
        {selectedBooking && (
          <div className="space-y-6 text-xs">
            {/* Status & Urgency */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedBooking.Status} />
                {selectedBooking.Urgency === 'Urgent' && (
                  <Badge variant="rose" size="sm">Urgent</Badge>
                )}
              </div>
              <span className="font-mono text-slate-400">
                {selectedBooking.Created_At ? new Date(selectedBooking.Created_At).toLocaleString() : ''}
              </span>
            </div>

            {/* Customer & Vehicle */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Customer</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBooking.Customer?.Name || selectedBooking.customer?.name}
                </p>
                <p className="text-slate-500">{selectedBooking.Customer?.Phone || selectedBooking.Customer?.Email}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBooking.Vehicle?.Make} {selectedBooking.Vehicle?.Model}
                </p>
                <p className="font-mono text-slate-500">{selectedBooking.Vehicle?.Registration_Number}</p>
              </div>
            </div>

            {/* Appointment Slot */}
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
              <span className="text-[10px] font-bold uppercase text-teal-800 dark:text-yellow-signal block">
                Appointment Slot
              </span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedBooking.Slot?.Date || selectedBooking.slot?.Date} ({selectedBooking.Slot?.Start_Time || selectedBooking.slot?.start_time} - {selectedBooking.Slot?.End_Time || selectedBooking.slot?.end_time})
              </p>
            </div>

            {/* Problem Description */}
            <div className="p-3.5 rounded-2xl bg-yellow-tint/20 dark:bg-yellow-signal/5 border border-yellow-signal/30 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Diagnostic Details</span>
              {selectedBooking.Problem_Categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedBooking.Problem_Categories.map(c => (
                    <Badge key={c} variant="teal">{c}</Badge>
                  ))}
                </div>
              )}
              {selectedBooking.Problem_Description && (
                <p className="italic text-slate-700 dark:text-slate-300">
                  "{selectedBooking.Problem_Description}"
                </p>
              )}
            </div>

            {/* Assigned Mechanic if present */}
            {selectedBooking.Mechanic && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Technician</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedBooking.Mechanic.Name}</p>
                  <p className="text-slate-500">{selectedBooking.Mechanic.Specialization} • {selectedBooking.Mechanic.Phone}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAssignDrawer(selectedBooking)}
                >
                  Reassign
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {selectedBooking.Status === 'Pending Approval' ? (
                <div className="flex gap-2 w-full">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleAcceptBooking(selectedBooking)}
                    icon={Check}
                  >
                    Accept Appointment
                  </Button>
                  <Button
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 flex-1"
                    onClick={() => handleOpenRejectModal(selectedBooking)}
                    icon={X}
                  >
                    Reject with Reason
                  </Button>
                </div>
              ) : selectedBooking.Status === 'Accepted' ? (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleOpenAssignDrawer(selectedBooking)}
                  icon={UserPlus}
                >
                  Dispatch Mechanic
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setDetailDrawerOpen(false)} className="w-full">
                  Close Inspection
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
