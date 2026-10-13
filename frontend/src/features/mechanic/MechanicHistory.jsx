import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileText, CheckCircle2, Calendar, Car } from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import { Card, StatusBadge, NumberPlate, EmptyState, Skeleton } from '../../shared/ui';
import { requestApi } from '../../api';

export function MechanicHistory() {
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await requestApi.list({ status: 'Completed' });
        setCompletedJobs(res.requests || []);
      } catch {
        toast.error('Failed to load completed jobs history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <DashboardLayout
      title="Completed Jobs History"
      subtitle="Historical record of signed-off repair orders and customer invoices"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)}
          </div>
        ) : completedJobs.length === 0 ? (
          <EmptyState
            title="No completed jobs yet"
            description="Jobs you mark as Completed from your workbench will appear here."
            icon={FileText}
          />
        ) : (
          <div className="space-y-4">
            {completedJobs.map(job => (
              <Card
                key={job.Request_ID}
                hoverEffect
                className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-soft"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      Work Order #{job.Request_ID}
                    </span>
                    <StatusBadge status={job.Status} />
                    <span className="text-xs text-slate-400 font-mono">
                      Completed: {job.Completed_At ? new Date(job.Completed_At).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {job.Vehicle?.Make} {job.Vehicle?.Model} ({job.Vehicle?.Year})
                    </h4>
                    {job.Vehicle && (
                      <NumberPlate registrationNumber={job.Vehicle.Registration_Number} size="sm" />
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    Customer: {job.Customer_Name} ({job.Customer_Phone})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice Issued</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {job.Invoice_Number || 'Generated'}
                  </span>
                  {job.Invoice_Total && (
                    <p className="font-mono text-xs text-emerald-600 font-bold mt-0.5">
                      ₹{job.Invoice_Total.toFixed(2)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
