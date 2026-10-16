import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3, TrendingUp, Calendar, Download, Printer,
  DollarSign, Wrench, Package, FileSpreadsheet, CheckCircle2,
  PieChart as PieIcon, RefreshCw, Users, Mail, Phone, Car,
  Eye, Search, AlertCircle, Clock, ShieldCheck, X
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, StatCard, Button, Badge, StatusBadge, Skeleton,
  Drawer, NumberPlate, EmptyState
} from '../../shared/ui';
import { reportApi } from '../../api';

const COLORS = ['#065F5B', '#FFD60A', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

export function AdminReports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Customer Tab State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerForDrawer, setSelectedCustomerForDrawer] = useState(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let data = null;
      if (activeTab === 'revenue') {
        data = await reportApi.revenue(fromDate, toDate);
      } else if (activeTab === 'bookings') {
        data = await reportApi.bookings(fromDate, toDate);
      } else if (activeTab === 'customers') {
        data = await reportApi.customerPerformance(fromDate, toDate);
      } else if (activeTab === 'inventory') {
        data = await reportApi.inventory(fromDate, toDate);
      } else if (activeTab === 'mechanics') {
        data = await reportApi.mechanicPerformance(fromDate, toDate);
      }
      setReportData(data);
    } catch {
      toast.error(`Failed to load ${activeTab} report`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, fromDate, toDate]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      let blob = null;
      let filename = `${activeTab}_report_${fromDate}_to_${toDate}.csv`;

      if (activeTab === 'revenue') {
        blob = await reportApi.revenue(fromDate, toDate, true);
      } else if (activeTab === 'bookings') {
        blob = await reportApi.bookings(fromDate, toDate, true);
      } else if (activeTab === 'customers') {
        blob = await reportApi.customerPerformance(fromDate, toDate, true);
        filename = `customer_performance_${fromDate}_to_${toDate}.csv`;
      } else if (activeTab === 'inventory') {
        blob = await reportApi.inventory(fromDate, toDate, true);
        filename = `inventory_report_${fromDate}_to_${toDate}.csv`;
      } else if (activeTab === 'mechanics') {
        blob = await reportApi.mechanicPerformance(fromDate, toDate, true);
      }

      if (blob) {
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('CSV report downloaded');
      }
    } catch {
      toast.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenCustomerDrawer = (customer) => {
    setSelectedCustomerForDrawer(customer);
    setCustomerDrawerOpen(true);
  };

  const filteredCustomers = useMemo(() => {
    if (!reportData?.customers) return [];
    if (!customerSearch.trim()) return reportData.customers;
    const q = customerSearch.toLowerCase();
    return reportData.customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.contact?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.vehicles?.some(v =>
        v.Registration_Number?.toLowerCase().includes(q) ||
        v.Make?.toLowerCase().includes(q) ||
        v.Model?.toLowerCase().includes(q)
      )
    );
  }, [reportData?.customers, customerSearch]);

  return (
    <DashboardLayout
      title="Analytics & Executive Reports"
      subtitle="Financial health, operational throughput, inventory valuation, and workshop technician KPIs"
    >
      <div className="space-y-6">
        {/* Date Filter & Export Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase">
              <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Reporting Window:
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-white"
            />
            <span className="text-neutral-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={handleExportCsv}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Report Sub-Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          {[
            { id: 'revenue', label: 'Revenue & Cashflow', icon: DollarSign },
            { id: 'bookings', label: 'Service Volume & Bookings', icon: BarChart3 },
            { id: 'customers', label: 'Customer Performance & Activity', icon: Users },
            { id: 'inventory', label: 'Inventory & Parts Consumption', icon: Package },
            { id: 'mechanics', label: 'Mechanic Throughput', icon: Wrench },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-700 text-teal-800 dark:border-signal-yellow dark:text-signal-yellow'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: REVENUE REPORT */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <StatCard
                    title="Total Revenue Realized"
                    value={`₹${(reportData?.summary?.total_revenue || 0).toLocaleString('en-IN')}`}
                    subtitle="Collected from settled invoices"
                    icon={DollarSign}
                  />
                  <StatCard
                    title="Outstanding Dues"
                    value={`₹${(reportData?.summary?.total_unpaid || 0).toLocaleString('en-IN')}`}
                    subtitle="Unpaid completed work orders"
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Settled Invoices"
                    value={reportData?.summary?.paid_invoices_count || 0}
                    subtitle={`Avg ticket: ₹${(reportData?.summary?.average_ticket || 0).toLocaleString('en-IN')}`}
                    icon={CheckCircle2}
                  />
                </div>

                {/* Chart Card */}
                <Card className="p-6">
                  <h3 className="font-bold text-neutral-900 dark:text-white text-base mb-4">
                    Daily Revenue Realization (INR ₹)
                  </h3>
                  <div className="h-72 w-full">
                    {reportData?.daily_trend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.daily_trend}>
                          <XAxis dataKey="date" stroke="#888888" fontSize={12} />
                          <YAxis stroke="#888888" fontSize={12} tickFormatter={val => `₹${val}`} />
                          <Tooltip formatter={val => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']} />
                          <Bar dataKey="amount" fill="#065F5B" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                        No financial revenue records captured within selected date range.
                      </div>
                    )}
                  </div>
                </Card>

                {/* Settled Invoices & Customer Ledger */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                        Settled Invoices & Customer Ledger
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Invoices settled by customers who serviced their vehicles at this workshop
                      </p>
                    </div>
                    <Badge variant="teal">{reportData?.invoices?.length || 0} Paid Invoices</Badge>
                  </div>

                  {reportData?.invoices?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase">
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Vehicle</th>
                            <th className="py-2.5 px-3 text-right">Labour</th>
                            <th className="py-2.5 px-3 text-right">Parts</th>
                            <th className="py-2.5 px-3 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {reportData.invoices.map(inv => (
                            <tr key={inv.Invoice_ID} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-teal-800 dark:text-teal-300">
                                {inv.Invoice_Number}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500">
                                {inv.Created_At ? inv.Created_At.slice(0, 10) : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  {inv.Customer_Name || inv.Customer?.Name || 'Unknown Customer'}
                                </div>
                                <div className="text-[11px] text-neutral-500 font-mono">
                                  {inv.Customer_Phone || inv.Customer?.Contact || ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                {inv.Vehicle_Plate ? (
                                  <NumberPlate plate={inv.Vehicle_Plate} />
                                ) : (
                                  <span className="text-neutral-400">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                ₹{(inv.Labour_Charge || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                ₹{(inv.Parts_Cost || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-900 dark:text-teal-200">
                                ₹{(inv.Total_Amount || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-neutral-400">
                      No settled invoice records found for this workshop within selected dates.
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB 2: BOOKINGS REPORT */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Bookings"
                    value={reportData?.summary?.total_bookings || 0}
                    subtitle="In selected period"
                    icon={BarChart3}
                  />
                  <StatCard
                    title="Completed Jobs"
                    value={reportData?.summary?.completed || 0}
                    subtitle="Successfully signed off"
                    icon={CheckCircle2}
                  />
                  <StatCard
                    title="Urgent Requests"
                    value={reportData?.summary?.urgent || 0}
                    subtitle="Priority dispatches"
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Cancellations"
                    value={reportData?.summary?.cancelled || 0}
                    subtitle="Slot returned to pool"
                    icon={Calendar}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="font-bold text-neutral-900 dark:text-white text-base mb-4">
                      Work Orders by Lifecycle Status
                    </h3>
                    <div className="h-64 w-full">
                      {reportData?.status_breakdown?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.status_breakdown}
                              dataKey="count"
                              nameKey="status"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ status, count }) => `${status}: ${count}`}
                            >
                              {reportData.status_breakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                          No booking status records found.
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-bold text-neutral-900 dark:text-white text-base mb-4">
                      Top Requested Maintenance Services
                    </h3>
                    <div className="space-y-3">
                      {reportData?.top_services?.map((svc, i) => (
                        <div key={svc.name} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{svc.name}</span>
                          <Badge variant="teal">{svc.count} orders</Badge>
                        </div>
                      ))}
                      {(!reportData?.top_services || reportData.top_services.length === 0) && (
                        <div className="text-sm text-neutral-400 text-center py-8">
                          No service item records available.
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Appointments & Customer Details Table */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                        Workshop Appointments & Customer Details
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Customer appointments booked exclusively at this service center
                      </p>
                    </div>
                    <Badge variant="teal">{reportData?.bookings?.length || 0} Bookings</Badge>
                  </div>

                  {reportData?.bookings?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase">
                            <th className="py-2.5 px-3">Order ID</th>
                            <th className="py-2.5 px-3">Customer Details</th>
                            <th className="py-2.5 px-3">Vehicle</th>
                            <th className="py-2.5 px-3">Appointment / Slot</th>
                            <th className="py-2.5 px-3">Problem / Service</th>
                            <th className="py-2.5 px-3">Mechanic</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {reportData.bookings.map(req => (
                            <tr key={req.Request_ID} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-teal-800 dark:text-teal-300">
                                #{req.Request_ID}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  {req.Customer_Name || req.Customer?.Name || 'Unknown Customer'}
                                </div>
                                <div className="text-[11px] text-neutral-500 font-mono">
                                  {req.Customer_Phone || req.Customer?.Contact || req.Customer_Email || ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                {req.Vehicle ? (
                                  <div className="flex flex-col gap-1">
                                    <NumberPlate plate={req.Vehicle.Registration_Number} />
                                    <span className="text-[11px] text-neutral-500">
                                      {req.Vehicle.Make} {req.Vehicle.Model}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-neutral-400">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-neutral-800 dark:text-neutral-200">
                                  {req.Slot?.Date || (req.Created_At ? req.Created_At.slice(0, 10) : 'N/A')}
                                </div>
                                {req.Slot?.Start_Time && (
                                  <div className="text-[11px] text-neutral-500 font-mono">
                                    {req.Slot.Start_Time} - {req.Slot.End_Time}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 max-w-xs">
                                <div className="truncate text-neutral-800 dark:text-neutral-200 font-medium">
                                  {req.Problem_Description || req.Services?.[0]?.Name || 'General Service'}
                                </div>
                                {req.Urgency && req.Urgency !== 'Routine' && (
                                  <Badge variant={req.Urgency === 'Urgent' ? 'danger' : 'warning'} className="mt-1 text-[10px]">
                                    {req.Urgency}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300">
                                {req.Mechanic?.user?.Name || req.Mechanic?.Name || 'Unassigned'}
                              </td>
                              <td className="py-2.5 px-3">
                                <StatusBadge status={req.Status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-neutral-400">
                      No customer appointments recorded at this workshop in selected window.
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOMER PERFORMANCE & ACTIVITY */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
              </div>
            ) : (
              <>
                {/* Isolation Guarantee Banner */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs">
                  <ShieldCheck className="w-5 h-5 text-teal-700 dark:text-teal-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Workshop Data Privacy & Customer Isolation: </span>
                    Showing exclusively the customers who have booked service appointments at this service center. Customers from other workshops are strictly excluded.
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <StatCard
                    title="Workshop Customers"
                    value={reportData?.summary?.total_customers || 0}
                    subtitle="Booked at this center"
                    icon={Users}
                  />
                  <StatCard
                    title="Repeat Clients"
                    value={reportData?.summary?.repeat_customers || 0}
                    subtitle="2+ visits at this center"
                    icon={CheckCircle2}
                  />
                  <StatCard
                    title="Appointments in Window"
                    value={reportData?.summary?.total_appointments || 0}
                    subtitle="Booked service slots"
                    icon={Calendar}
                  />
                  <StatCard
                    title="Revenue Realized"
                    value={`₹${(reportData?.summary?.total_revenue || 0).toLocaleString('en-IN')}`}
                    subtitle="Paid by workshop clients"
                    icon={DollarSign}
                  />
                </div>

                {/* Customer Directory Table */}
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                        Customer Roster & Appointment Performance
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Details of car owners who have scheduled vehicle appointments at this service center
                      </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search by name, phone, email, plate..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>

                  {filteredCustomers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-3">Customer Name</th>
                            <th className="py-3 px-3">Contact Details</th>
                            <th className="py-3 px-3">Serviced Vehicles</th>
                            <th className="py-3 px-3 text-center">Window Visits</th>
                            <th className="py-3 px-3 text-center">Lifetime Visits</th>
                            <th className="py-3 px-3 text-right">Total Spend (INR)</th>
                            <th className="py-3 px-3">Last Appointment</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {filteredCustomers.map(cust => (
                            <tr key={cust.customer_id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-neutral-900 dark:text-white text-sm">
                                  {cust.name}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono">
                                  UID #{cust.customer_id}
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-medium">
                                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                                  <a href={`tel:${cust.contact}`} className="hover:underline">{cust.contact || 'N/A'}</a>
                                </div>
                                {cust.email && (
                                  <div className="flex items-center gap-1.5 text-neutral-500 mt-0.5">
                                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                    <a href={`mailto:${cust.email}`} className="hover:underline">{cust.email}</a>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {cust.vehicles?.length > 0 ? (
                                    cust.vehicles.map(v => (
                                      <div key={v.Vehicle_ID} className="flex flex-col">
                                        <NumberPlate plate={v.Registration_Number} />
                                        <span className="text-[10px] text-neutral-500 mt-0.5">
                                          {v.Make} {v.Model}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-neutral-400 italic">No vehicles logged</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <Badge variant="teal">{cust.appointments_in_period} booked</Badge>
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-neutral-800 dark:text-neutral-200">
                                {cust.total_appointments}
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-bold text-teal-900 dark:text-teal-200 text-sm">
                                ₹{(cust.total_spent || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-3 text-neutral-600 dark:text-neutral-300">
                                {cust.last_appointment_date || 'N/A'}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenCustomerDrawer(cust)}
                                  className="text-xs py-1 px-2.5 h-auto inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Appointments ({cust.recent_appointments?.length || 0})
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Users className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                      <h4 className="text-base font-bold text-neutral-800 dark:text-white">
                        No Customer Appointments Found
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                        Only customers who have scheduled appointments at this service center within the selected reporting window are displayed.
                      </p>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB 3: INVENTORY REPORT */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <StatCard
                    title="Total Stock Asset Valuation"
                    value={`₹${(reportData?.summary?.total_asset_value || 0).toLocaleString('en-IN')}`}
                    subtitle="Holding cost across all warehouse SKUs"
                    icon={Package}
                  />
                  <StatCard
                    title="Cataloged Parts"
                    value={reportData?.summary?.total_skus || 0}
                    subtitle="Unique component references"
                    icon={BarChart3}
                  />
                  <StatCard
                    title="Critical Low-Stock Items"
                    value={reportData?.summary?.low_stock_count || 0}
                    subtitle="Items below safety threshold"
                    icon={TrendingUp}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="font-bold text-neutral-900 dark:text-white text-base mb-4">
                      High Consumption Parts (Units Used in Window)
                    </h3>
                    <div className="h-72 w-full">
                      {reportData?.most_used?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.most_used} layout="vertical">
                            <XAxis type="number" stroke="#888888" fontSize={12} />
                            <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} width={130} />
                            <Tooltip
                              formatter={(val, name, item) => [
                                `${val} ${item?.payload?.unit || 'units'} (${item?.payload?.sku || ''})`,
                                'Used'
                              ]}
                            />
                            <Bar dataKey="quantity" fill="#065F5B" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                          No component consumption records in this period.
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                        Attention Required (Low & Out of Stock)
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {(reportData?.out_of_stock_parts?.length || 0) + (reportData?.low_stock_parts?.length || 0)} items
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {reportData?.out_of_stock_parts?.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-xs">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-neutral-900 dark:text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">{p.sku} • {p.category}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-red-600 font-mono">0 / min {p.min_threshold} {p.unit}</span>
                            <Badge variant="danger">Out of stock</Badge>
                          </div>
                        </div>
                      ))}
                      {reportData?.low_stock_parts?.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-xs">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-neutral-900 dark:text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">{p.sku} • {p.category}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">{p.quantity_in_stock} / min {p.min_threshold} {p.unit}</span>
                            <Badge variant="warning">Low stock</Badge>
                          </div>
                        </div>
                      ))}
                      {(!reportData?.out_of_stock_parts?.length && !reportData?.low_stock_parts?.length) && (
                        <div className="h-56 flex flex-col items-center justify-center text-sm text-neutral-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                          <span>All cataloged parts are above safety minimum thresholds.</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: MECHANIC PERFORMANCE REPORT */}
        {activeTab === 'mechanics' && (
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Technician Name</th>
                        <th className="py-3.5 px-4">Specialization</th>
                        <th className="py-3.5 px-4">Jobs Completed</th>
                        <th className="py-3.5 px-4">Active Jobs</th>
                        <th className="py-3.5 px-4">Total Billed Hours</th>
                        <th className="py-3.5 px-4 text-right">Labour Value Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                      {reportData?.mechanics?.map(m => (
                        <tr key={m.mechanic_id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                            {m.name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-neutral-500">
                            {m.specialization}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-teal-800 dark:text-teal-300">
                            {m.completed_jobs}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={m.active_jobs > 0 ? 'warning' : 'neutral'}>
                              {m.active_jobs} active
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono">
                            {m.total_hours_logged} hrs
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-900 dark:text-teal-200">
                            ₹{(m.total_labour_revenue || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {(!reportData?.mechanics || reportData.mechanics.length === 0) && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-neutral-400 text-sm">
                            No mechanic performance metrics recorded in this window.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Appointment History Drawer */}
        <Drawer
          isOpen={customerDrawerOpen}
          onClose={() => setCustomerDrawerOpen(false)}
          title="Customer Appointment History"
        >
          {selectedCustomerForDrawer && (
            <div className="space-y-6">
              {/* Customer Profile Summary */}
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-neutral-900 dark:text-white">
                      {selectedCustomerForDrawer.name}
                    </h4>
                    <span className="text-[11px] font-mono text-neutral-500">UID #{selectedCustomerForDrawer.customer_id}</span>
                  </div>
                  <Badge variant={selectedCustomerForDrawer.is_active ? 'success' : 'danger'}>
                    {selectedCustomerForDrawer.is_active ? 'Active Client' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Phone</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedCustomerForDrawer.contact || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Email</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedCustomerForDrawer.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Workshop Appointments</span>
                    <span className="font-bold text-teal-800 dark:text-teal-300">{selectedCustomerForDrawer.total_appointments} visits</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Revenue Realized</span>
                    <span className="font-bold font-mono text-teal-800 dark:text-teal-300">₹{(selectedCustomerForDrawer.total_spent || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Serviced Vehicles */}
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  Vehicles Serviced at this Workshop
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomerForDrawer.vehicles?.map(v => (
                    <div key={v.Vehicle_ID} className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center gap-2 text-xs">
                      <Car className="w-4 h-4 text-teal-700" />
                      <div>
                        <div className="font-bold">{v.Make} {v.Model} ({v.Year})</div>
                        <NumberPlate plate={v.Registration_Number} />
                      </div>
                    </div>
                  ))}
                  {(!selectedCustomerForDrawer.vehicles || selectedCustomerForDrawer.vehicles.length === 0) && (
                    <span className="text-xs text-neutral-400">No vehicles on record</span>
                  )}
                </div>
              </div>

              {/* Appointments List */}
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  Workshop Appointments ({selectedCustomerForDrawer.recent_appointments?.length || 0})
                </h5>
                <div className="space-y-3">
                  {selectedCustomerForDrawer.recent_appointments?.map(apt => (
                    <div key={apt.request_id} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-teal-800 dark:text-teal-300 font-mono">
                          Work Order #{apt.request_id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {apt.urgency && apt.urgency !== 'Routine' && (
                            <Badge variant={apt.urgency === 'Urgent' ? 'danger' : 'warning'} className="text-[10px]">
                              {apt.urgency}
                            </Badge>
                          )}
                          <StatusBadge status={apt.status} />
                        </div>
                      </div>

                      <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                        {apt.problem}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div>
                          <span className="text-neutral-400">Date:</span> {apt.date}
                        </div>
                        <div>
                          <span className="text-neutral-400">Slot:</span> {apt.slot_time}
                        </div>
                        <div>
                          <span className="text-neutral-400">Vehicle:</span> {apt.vehicle}
                        </div>
                        <div>
                          <span className="text-neutral-400">Technician:</span> {apt.mechanic}
                        </div>
                      </div>

                      {apt.invoice_total !== null && (
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                          <span className="text-neutral-500 font-medium">Invoice Total:</span>
                          <span className="font-bold font-mono text-teal-800 dark:text-teal-300">
                            ₹{apt.invoice_total.toLocaleString('en-IN')} ({apt.invoice_status})
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedCustomerForDrawer.recent_appointments || selectedCustomerForDrawer.recent_appointments.length === 0) && (
                    <div className="text-center py-6 text-xs text-neutral-400">
                      No appointments recorded for this customer in this window.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </DashboardLayout>
  );
}
