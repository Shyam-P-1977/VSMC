import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Shield, Users, Wrench, Clock, DollarSign, AlertTriangle,
  Calendar, CheckCircle2, ArrowRight, UserCheck, Inbox,
  Copy, CheckCheck, Building2, MapPin
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, StatCard, Button, Badge, StatusBadge,
  Drawer, Select, NumberPlate, Skeleton
} from '../../shared/ui';
import { adminApi, requestApi, mechanicApi, centerApi } from '../../api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [urgentPending, setUrgentPending] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [availableMechanics, setAvailableMechanics] = useState([]);
  const [center, setCenter] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Assign Mechanic Drawer state
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedReqForAssign, setSelectedReqForAssign] = useState(null);
  const [selectedMechId, setSelectedMechId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, mechRes, centerRes] = await Promise.all([
        adminApi.getDashboardKpis(),
        mechanicApi.getAvailable(),
        centerApi.getCenterProfile().catch(() => null)
      ]);
      setKpis(dashRes.kpis);
      setUrgentPending(dashRes.urgent_pending || []);
      setRecentBookings(dashRes.recent_bookings || []);
      setAvailableMechanics(mechRes.mechanics || []);
      setCenter(dashRes.center || centerRes?.center || null);
    } catch {
      toast.error('Failed to load admin metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Service Center Code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenAssign = (req) => {
    setSelectedReqForAssign(req);
    setSelectedMechId(availableMechanics.length > 0 ? String(availableMechanics[0].Mechanic_ID) : '');
    setAssignDrawerOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMechId || !selectedReqForAssign) {
      toast.error('Please choose a mechanic to assign');
      return;
    }
    try {
      setAssigning(true);
      await mechanicApi.assignMechanic(selectedReqForAssign.Request_ID, Number(selectedMechId));
      toast.success(`Mechanic successfully assigned to Work Order #${selectedReqForAssign.Request_ID}`);
      setAssignDrawerOpen(false);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  // Mock chart data derived from KPI metrics
  const chartData = [
    { name: 'Pending', count: kpis?.pending_requests || 0, fill: '#FFD60A' },
    { name: 'Active', count: kpis?.active_jobs || 0, fill: '#065F5B' },
    { name: 'Completed', count: kpis?.completed_jobs || 0, fill: '#10B981' }
  ];

  const centerCodeDisplay = center?.center_code || 'VSC-PUN-E314';

  return (
    <DashboardLayout
      title="Admin Command Center"
      subtitle="Operational KPIs, mechanic allocations, and high-priority dispatch queues"
    >
      <div className="space-y-6">
        {/* Service Center Identification & Code Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-teal-950 p-6 sm:p-7 text-white shadow-xl border border-teal-700/60">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#FFD60A_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ● {center?.approval_status || 'Authorized'} Workshop
                </span>
                <span className="text-xs text-teal-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-300" />
                  {center?.city ? `${center.city}, ${center.state || 'Maharashtra'}` : 'Authorized Service Center'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black tracking-wide text-white">
                {center?.name || 'Authorized Automotive Workshop'}
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/80 max-w-xl">
                Mechanics join your station using this code during signup to access work orders and diagnostics.
              </p>
            </div>

            {/* Prominent Center Code Badge & Copy Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-inner">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200">
                  SERVICE CENTER CODE
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-yellow-signal select-all">
                  {centerCodeDisplay}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(centerCodeDisplay)}
                className="px-4 py-2.5 rounded-xl bg-yellow-signal hover:bg-yellow-400 text-teal-950 text-xs font-black transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
                title="Copy service center code"
              >
                {copiedCode ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-900" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-teal-950" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Pending Requests"
              value={kpis?.pending_requests || 0}
              subtitle="Awaiting mechanic dispatch"
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="Active In-Bay Jobs"
              value={kpis?.active_jobs || 0}
              subtitle="Assigned / In Progress"
              icon={Wrench}
              color="teal"
            />
            <StatCard
              title="Monthly Revenue"
              value={`₹${(kpis?.revenue_this_month || 0).toLocaleString('en-IN')}`}
              subtitle="Paid invoices this month"
              icon={DollarSign}
              color="teal"
            />
            <StatCard
              title="Low Stock Parts"
              value={kpis?.low_stock_count || 0}
              subtitle="Below threshold alert"
              icon={AlertTriangle}
              color={kpis?.low_stock_count > 0 ? "rose" : "teal"}
            />
          </div>
        )}

        {/* Charts & Urgent Dispatch Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Urgent Dispatch Queue (Urgent First!) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Priority Dispatch Queue</span>
                  {urgentPending.length > 0 && (
                    <Badge variant="rose" size="sm">{urgentPending.length} URGENT</Badge>
                  )}
                </h3>
                <p className="text-xs text-slate-500">Unassigned pending customer bookings</p>
              </div>
            </div>

            {urgentPending.length === 0 ? (
              <Card className="p-8 text-center bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No pending urgent work orders
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  All urgent and routine bookings have been assigned or triaged.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {urgentPending.map((req) => (
                  <Card
                    key={req.Request_ID}
                    className="p-5 bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          #{req.Request_ID}
                        </span>
                        <Badge variant="rose" size="sm">Urgent Priority</Badge>
                        <span className="text-xs text-slate-400 font-mono">
                          Slot: {req.Slot?.Date} • {req.Slot?.Start_Time}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {req.Vehicle?.Make} {req.Vehicle?.Model}
                        </h4>
                        {req.Vehicle && (
                          <NumberPlate registrationNumber={req.Vehicle.Registration_Number} size="sm" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-1">
                        "{req.Problem_Description || 'Driver reported urgent breakdown'}"
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenAssign(req)}
                        icon={UserCheck}
                      >
                        Assign Mechanic
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Chart & Workshop Workload */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
              Workshop Status Distribution
            </h3>
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-soft">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Available Active Mechanics:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {availableMechanics.length} Available
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Work Orders Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
                Recent Workshop Activity
              </h3>
              <p className="text-xs text-slate-500">Latest 10 bookings across customer garages</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/bookings')}
              icon={ArrowRight}
            >
              All Bookings
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-soft">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Date / Slot</th>
                  <th className="p-3.5">Urgency</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentBookings.map((r) => (
                  <tr key={r.Request_ID} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono font-bold">#{r.Request_ID}</td>
                    <td className="p-3.5 font-medium">{r.Customer_Name}</td>
                    <td className="p-3.5">
                      <span className="font-semibold">{r.Vehicle?.Make} {r.Vehicle?.Model}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{r.Vehicle?.Registration_Number}</span>
                    </td>
                    <td className="p-3.5 font-mono">{r.Slot?.Date} ({r.Slot?.Start_Time})</td>
                    <td className="p-3.5">
                      <Badge variant={r.Urgency === 'Urgent' ? 'rose' : 'gray'} size="sm">
                        {r.Urgency}
                      </Badge>
                    </td>
                    <td className="p-3.5"><StatusBadge status={r.Status} /></td>
                    <td className="p-3.5 text-right">
                      {['Pending', 'Assigned'].includes(r.Status) ? (
                        <button
                          onClick={() => handleOpenAssign(r)}
                          className="px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold hover:bg-teal-100"
                        >
                          {r.Status === 'Pending' ? 'Assign' : 'Reassign'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">In Bay</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ASSIGN MECHANIC DRAWER (ONLY AVAILABLE + ACTIVE MECHANICS) */}
      <Drawer
        isOpen={assignDrawerOpen}
        onClose={() => setAssignDrawerOpen(false)}
        title={selectedReqForAssign ? `Assign Mechanic • #${selectedReqForAssign.Request_ID}` : "Assign Mechanic"}
        subtitle="Mechanic dispatch is controlled exclusively by administrator"
      >
        {selectedReqForAssign && (
          <form onSubmit={handleAssignSubmit} className="space-y-6">
            <div className="p-4 rounded-2xl bg-teal-900 text-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-300">Target Vehicle</span>
              <h4 className="text-base font-bold">
                {selectedReqForAssign.Vehicle?.Make} {selectedReqForAssign.Vehicle?.Model} ({selectedReqForAssign.Vehicle?.Registration_Number})
              </h4>
              <p className="text-xs text-teal-200">
                Customer: {selectedReqForAssign.Customer_Name} ({selectedReqForAssign.Customer_Phone})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Choose Available & Active Mechanic:
              </label>

              {availableMechanics.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-800 dark:text-amber-300 text-xs">
                  No active mechanics are currently marked available. Please free up a technician or adjust availability in the Mechanics tab.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {availableMechanics.map((mech) => {
                    const isSelected = selectedMechId === String(mech.Mechanic_ID);
                    return (
                      <div
                        key={mech.Mechanic_ID}
                        onClick={() => setSelectedMechId(String(mech.Mechanic_ID))}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-yellow-signal bg-yellow-tint/20 dark:bg-yellow-signal/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                            <Wrench className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">{mech.Name}</h5>
                            <p className="text-xs text-teal-600 dark:text-yellow-signal">{mech.Specialization}</p>
                          </div>
                        </div>

                        <span className={`text-xs font-bold ${isSelected ? 'text-teal-800 dark:text-yellow-signal' : 'text-slate-400'}`}>
                          {isSelected ? '✓ Selected' : 'Select'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={assigning}
                disabled={availableMechanics.length === 0}
              >
                Confirm Mechanic Assignment
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
