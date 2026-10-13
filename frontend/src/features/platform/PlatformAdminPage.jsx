import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Shield, Building2, Users, Calendar, CheckCircle2,
  XCircle, AlertTriangle, Eye, Search, Filter, RefreshCw,
  TrendingUp, DollarSign, MapPin, Phone, Mail, Award
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import { Card, Button, Badge, StatusBadge, Modal, Textarea, Skeleton } from '../../shared/ui';
import { centerApi } from '../../api';

export function PlatformAdminPage() {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('centers'); // 'centers' | 'customers' | 'bookings'
  const [centers, setCenters] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Center Status Filter
  const [centerStatusFilter, setCenterStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Center Action Modals
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [actionType, setActionType] = useState(null); // 'reject' | 'suspend'
  const [actionReason, setActionReason] = useState('');
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await centerApi.getPlatformStats();
      setStats(res.stats);
    } catch {
      // ignore
    }
  };

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const res = await centerApi.getPlatformCenters(centerStatusFilter || undefined);
      setCenters(res.centers || []);
    } catch {
      toast.error('Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await centerApi.getPlatformCustomers();
      setCustomers(res.customers || []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await centerApi.getPlatformBookings();
      setBookings(res.bookings || []);
    } catch {
      toast.error('Failed to load system bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'centers') fetchCenters();
    else if (activeTab === 'customers') fetchCustomers();
    else if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, centerStatusFilter]);

  // Center Actions
  const handleApprove = async (c) => {
    try {
      await centerApi.approvePlatformCenter(c.id);
      toast.success(`Center "${c.name}" has been Approved and is now live!`);
      fetchCenters();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve center');
    }
  };

  const handleOpenActionModal = (c, type) => {
    setSelectedCenter(c);
    setActionType(type);
    setActionReason(type === 'reject' ? 'Incomplete licensing documents.' : 'Temporary policy compliance review.');
    setActionModalOpen(true);
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!selectedCenter || !actionReason) return;

    try {
      setProcessingAction(true);
      if (actionType === 'reject') {
        await centerApi.rejectPlatformCenter(selectedCenter.id, actionReason);
        toast.success(`Center "${selectedCenter.name}" rejected.`);
      } else {
        await centerApi.suspendPlatformCenter(selectedCenter.id, actionReason);
        toast.success(`Center "${selectedCenter.name}" suspended.`);
      }
      setActionModalOpen(false);
      fetchCenters();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <DashboardLayout
      title="Platform Operations Supervisor"
      subtitle="Maharashtra Multi-Center Governance, Verification & Auditing Hub"
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Centers</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.total_centers ?? '--'}
              </span>
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
              {stats?.approved_centers ?? '--'} Approved & Active
            </span>
          </Card>

          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Reviews</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-amber-600 font-mono">
                {stats?.pending_centers ?? 0}
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Requires approval</span>
          </Card>

          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Customers</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.total_customers ?? '--'}
              </span>
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-[11px] text-teal-600 font-semibold block mt-1">Fleet Owners</span>
          </Card>

          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Work Orders</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-teal-700 dark:text-yellow-signal font-mono">
                {stats?.total_bookings ?? '--'}
              </span>
              <Calendar className="w-5 h-5 text-yellow-signal" />
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Statewide appointments</span>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('centers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'centers'
                ? 'bg-teal-900 text-white dark:bg-yellow-signal dark:text-ink shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Service Centers ({centers.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'customers'
                ? 'bg-teal-900 text-white dark:bg-yellow-signal dark:text-ink shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'bookings'
                ? 'bg-teal-900 text-white dark:bg-yellow-signal dark:text-ink shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Statewide Bookings ({bookings.length})
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: SERVICE CENTERS LIST */}
        {/* ============================================================ */}
        {activeTab === 'centers' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                {['', 'Pending', 'Approved', 'Rejected', 'Suspended'].map(st => (
                  <button
                    key={st}
                    onClick={() => setCenterStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                      centerStatusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st === '' ? 'All Centers' : st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by name, city, area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : centers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                No service centers matching current criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {centers
                  .filter(c => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.area.toLowerCase().includes(q);
                  })
                  .map(c => {
                    const isPending = c.approval_status === 'Pending';
                    const isApproved = c.approval_status === 'Approved';

                    return (
                      <Card
                        key={c.id}
                        className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900 dark:text-white">
                              {c.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.approval_status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : c.approval_status === 'Pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {c.approval_status}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Rating: {Number(c.avg_rating || 4.5).toFixed(1)} ★
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-teal-600" />
                              {c.area}, {c.city}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {c.phone}
                            </span>
                            <span>•</span>
                            <span>{c.email}</span>
                          </div>
                        </div>

                        {/* Actions: Approve / Reject / Suspend */}
                        <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          {isPending ? (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApprove(c)}
                                icon={CheckCircle2}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => handleOpenActionModal(c, 'reject')}
                                icon={XCircle}
                              >
                                Reject
                              </Button>
                            </>
                          ) : isApproved ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => handleOpenActionModal(c, 'suspend')}
                            >
                              Suspend Center
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(c)}
                            >
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: REGISTERED CUSTOMERS */}
        {/* ============================================================ */}
        {activeTab === 'customers' && (
          <div className="space-y-3">
            {customers.map(cust => (
              <Card key={cust.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{cust.name}</h4>
                  <p className="text-slate-500">{cust.email} • {cust.contact || cust.phone || 'No phone'}</p>
                  <p className="text-teal-700 dark:text-teal-300 mt-0.5">
                    Location: {cust.area ? `${cust.area}, ${cust.city}` : 'Not set'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-slate-400">ID #{cust.id}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SYSTEM BOOKINGS OVERVIEW */}
        {/* ============================================================ */}
        {activeTab === 'bookings' && (
          <div className="space-y-3">
            {bookings.map(b => (
              <Card key={b.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">Order #{b.id}</span>
                    <StatusBadge status={b.status} />
                    <span className="text-slate-400 font-mono">{b.date}</span>
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    Center: {b.center_name} • Customer: {b.customer_name}
                  </p>
                  <p className="text-slate-500 font-mono">
                    Vehicle: {b.vehicle_plate} • Urgency: {b.urgency}
                  </p>
                </div>
                <div className="text-right font-mono text-slate-400">
                  {b.created_at ? new Date(b.created_at).toLocaleDateString() : ''}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action (Reject / Suspend) Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        maxWidth="max-w-md"
        title={actionType === 'reject' ? "Reject Service Center Registration" : "Suspend Service Center"}
        subtitle="Provide mandatory supervisory note to the center owner"
      >
        {selectedCenter && (
          <form onSubmit={handleConfirmAction} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block">{selectedCenter.name}</span>
              <span className="text-slate-500">{selectedCenter.area}, {selectedCenter.city}</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Reason / Supervisory Action Note (Required)
              </label>
              <Textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setActionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={actionType === 'reject' ? 'danger' : 'secondary'}
                isLoading={processingAction}
              >
                Confirm {actionType === 'reject' ? 'Rejection' : 'Suspension'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}
