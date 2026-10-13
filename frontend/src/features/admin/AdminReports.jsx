import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3, TrendingUp, Calendar, Download, Printer,
  DollarSign, Wrench, Package, FileSpreadsheet, CheckCircle2,
  PieChart as PieIcon, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, StatCard, Button, Badge, Skeleton
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

  const fetchReport = async () => {
    try {
      setLoading(true);
      let data = null;
      if (activeTab === 'revenue') {
        data = await reportApi.revenue(fromDate, toDate);
      } else if (activeTab === 'bookings') {
        data = await reportApi.bookings(fromDate, toDate);
      } else if (activeTab === 'inventory') {
        data = await reportApi.inventory();
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
      } else if (activeTab === 'inventory') {
        blob = await reportApi.inventory(true);
        filename = `inventory_valuation_${toDate}.csv`;
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
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          {[
            { id: 'revenue', label: 'Revenue & Cashflow', icon: DollarSign },
            { id: 'bookings', label: 'Service Volume & Bookings', icon: BarChart3 },
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

                <Card className="p-6">
                  <h3 className="font-bold text-neutral-900 dark:text-white text-base mb-4">
                    High Consumption Parts (Units Used)
                  </h3>
                  <div className="h-64 w-full">
                    {reportData?.most_used?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.most_used} layout="vertical">
                          <XAxis type="number" stroke="#888888" fontSize={12} />
                          <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} width={150} />
                          <Tooltip />
                          <Bar dataKey="quantity" fill="#FFD60A" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                        No component consumption records found.
                      </div>
                    )}
                  </div>
                </Card>
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
      </div>
    </DashboardLayout>
  );
}
