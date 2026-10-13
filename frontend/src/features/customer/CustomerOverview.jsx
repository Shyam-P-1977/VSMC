import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car, Calendar, FileText, Plus, ArrowRight, Clock,
  CheckCircle, AlertCircle, ChevronRight, Activity, Wrench
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, StatCard, Button, Badge, StatusBadge,
  NumberPlate, Skeleton, CardSkeleton
} from '../../shared/ui';
import { vehicleApi, requestApi, billingApi } from '../../api';

export function CustomerOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vRes, rRes, iRes] = await Promise.all([
          vehicleApi.list(),
          requestApi.list(),
          billingApi.list()
        ]);
        setVehicles(vRes.vehicles || []);
        setRequests(rRes.requests || []);
        setInvoices(iRes.invoices || []);
      } catch (err) {
        console.error("Failed to load customer overview data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Find most relevant active request
  const activeRequest = requests.find(r => ['Pending', 'Assigned', 'In Progress', 'Awaiting Parts'].includes(r.Status))
    || requests.find(r => r.Status === 'Completed' && r.Invoice_Status === 'Unpaid')
    || requests[0];

  const unpaidInvoices = invoices.filter(i => i.Status === 'Unpaid');

  // Tracker steps for the active service card
  const trackerSteps = [
    { key: 'Pending', label: 'Booked' },
    { key: 'Assigned', label: 'Assigned' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'Completed', label: 'Ready' },
    { key: 'Paid', label: 'Paid' },
  ];

  const getStepStatus = (stepKey, currentReq) => {
    if (!currentReq) return 'upcoming';
    const statusOrder = ['Pending', 'Assigned', 'In Progress', 'Completed'];
    const currentIdx = statusOrder.indexOf(currentReq.Status);
    const stepIdx = statusOrder.indexOf(stepKey);

    if (stepKey === 'Paid') {
      return currentReq.Invoice_Status === 'Paid' ? 'completed' : 'upcoming';
    }

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'current';
    return 'upcoming';
  };

  return (
    <DashboardLayout
      title="Customer Portal"
      subtitle="Track active vehicle maintenance and manage garage bookings"
    >
      <div className="space-y-8">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="My Vehicles"
            value={vehicles.length}
            subtitle="Registered in garage"
            icon={Car}
            color="teal"
          />
          <StatCard
            title="Active Work Orders"
            value={requests.filter(r => ['Pending', 'Assigned', 'In Progress', 'Awaiting Parts'].includes(r.Status)).length}
            subtitle="Currently in workshop"
            icon={Activity}
            color="yellow"
          />
          <StatCard
            title="Unpaid Invoices"
            value={unpaidInvoices.length}
            subtitle={unpaidInvoices.length > 0 ? `₹${unpaidInvoices.reduce((acc, i) => acc + i.Total_Amount, 0).toLocaleString('en-IN')} pending` : 'All cleared'}
            icon={FileText}
            color={unpaidInvoices.length > 0 ? 'rose' : 'teal'}
          />
        </div>

        {/* ACTIVE SERVICE CARD WITH PROGRESS TRACKER */}
        {loading ? (
          <CardSkeleton />
        ) : activeRequest ? (
          <Card className="bg-gradient-to-br from-teal-900 to-teal-950 text-white border border-teal-800 p-6 md:p-8 shadow-soft-lg rounded-3xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-teal-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-signal text-ink flex items-center justify-center font-bold">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono text-teal-300 font-bold tracking-wider">
                      Work Order #{activeRequest.Request_ID}
                    </span>
                    <StatusBadge status={activeRequest.Status} />
                    {activeRequest.Urgency === 'Urgent' && (
                      <Badge variant="rose" size="sm">Urgent</Badge>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {activeRequest.Vehicle?.Make} {activeRequest.Vehicle?.Model} ({activeRequest.Vehicle?.Year})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeRequest.Vehicle && (
                  <NumberPlate registrationNumber={activeRequest.Vehicle.Registration_Number} size="sm" />
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/dashboard/bookings')}
                >
                  View Timeline
                </Button>
              </div>
            </div>

            {/* Live Progress Tracker */}
            <div className="py-8">
              <div className="relative flex items-center justify-between max-w-3xl mx-auto">
                {/* Horizontal line */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-teal-800 z-0" />

                {trackerSteps.map((step) => {
                  const state = getStepStatus(step.key, activeRequest);
                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold text-xs md:text-sm border-2 transition-all ${
                          state === 'completed'
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow'
                            : state === 'current'
                            ? 'bg-yellow-signal border-yellow-signal text-ink shadow-yellow-glow scale-110'
                            : 'bg-teal-950 border-teal-800 text-teal-400'
                        }`}
                      >
                        {state === 'completed' ? '✓' : ''}
                        {state === 'current' ? '●' : ''}
                      </div>
                      <span
                        className={`mt-2 text-[11px] md:text-xs font-semibold whitespace-nowrap ${
                          state === 'current'
                            ? 'text-yellow-signal font-bold'
                            : state === 'completed'
                            ? 'text-emerald-300'
                            : 'text-teal-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Summary Bar */}
            <div className="pt-4 border-t border-teal-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-teal-200 gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-signal" />
                <span>
                  Slot: {activeRequest.Slot?.Date} • {activeRequest.Slot?.Start_Time} - {activeRequest.Slot?.End_Time}
                </span>
              </div>
              <div>
                <span>Mechanic Assigned: </span>
                <span className="font-bold text-white">
                  {activeRequest.Mechanic?.Name || 'Pending Dispatch'}
                </span>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-3xl">
            <h3 className="text-xl font-display uppercase tracking-wide font-bold text-teal-900 dark:text-teal-100">
              No active vehicle service in progress
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Ready for your periodic inspection or urgent repairs? Book an hourly slot now.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard/book')}
              icon={Plus}
            >
              Book Service Now
            </Button>
          </Card>
        )}

        {/* Quick Actions & Garage Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: My Vehicles Quick List */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
                My Registered Vehicles
              </h4>
              <Link
                to="/dashboard/vehicles"
                className="text-xs font-semibold text-teal-700 dark:text-yellow-signal hover:underline flex items-center gap-1"
              >
                Manage all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {vehicles.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-400">
                No vehicles added yet.{' '}
                <Link to="/dashboard/vehicles" className="text-teal-600 dark:text-yellow-signal font-bold underline">
                  Add your first car
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {vehicles.slice(0, 3).map((v) => (
                  <Card
                    key={v.Vehicle_ID}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-teal-600 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {v.Make} {v.Model}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {v.Year} • {v.Fuel_Type} • {v.Color}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <NumberPlate registrationNumber={v.Registration_Number} size="sm" />
                      <button
                        onClick={() => navigate(`/dashboard/book?vehicle_id=${v.Vehicle_ID}`)}
                        className="px-3 py-1.5 rounded-full bg-yellow-signal text-ink text-xs font-bold hover:bg-yellow-hover transition"
                      >
                        Book
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right: Recent Invoices & Quick Pay */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
                Recent Invoices & Bills
              </h4>
              <Link
                to="/dashboard/invoices"
                className="text-xs font-semibold text-teal-700 dark:text-yellow-signal hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {invoices.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-400">
                No invoices issued yet.
              </Card>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 3).map((inv) => (
                  <Card
                    key={inv.Invoice_ID}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {inv.Invoice_Number}
                        </span>
                        <StatusBadge status={inv.Status} />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Vehicle: {inv.Vehicle_Plate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                        ₹{inv.Total_Amount.toLocaleString('en-IN')}
                      </span>
                      {inv.Status === 'Unpaid' ? (
                        <button
                          onClick={() => navigate(`/dashboard/invoices?pay=${inv.Invoice_ID}`)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                        >
                          Pay
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/dashboard/invoices?view=${inv.Invoice_ID}`)}
                          className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
