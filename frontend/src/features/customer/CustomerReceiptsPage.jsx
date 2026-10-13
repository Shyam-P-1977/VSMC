import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileText, Download, Printer, Eye, CheckCircle2, Building2 } from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import { Card, Button, Badge, EmptyState, Skeleton, NumberPlate } from '../../shared/ui';
import { paymentApi } from '../../api';
import { DetailedReceiptModal } from './DetailedReceiptModal';

export function CustomerReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await paymentApi.listReceipts();
      setReceipts(res.receipts || []);
    } catch {
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleOpenReceipt = async (r) => {
    try {
      const paymentId = r.payment_id || r.id;
      const res = await paymentApi.getReceipt(paymentId);
      setSelectedReceipt(res.receipt);
      setModalOpen(true);
    } catch {
      toast.error('Could not load detailed receipt');
    }
  };

  const handleDownloadDirectPdf = (r) => {
    const paymentId = r.payment_id || r.id;
    const url = paymentApi.getReceiptPdfUrl(paymentId);
    window.open(url, '_blank');
  };

  return (
    <DashboardLayout
      title="My Receipts"
      subtitle="Official GST payment receipts for settled service orders"
    >
      <div className="space-y-6">
        <DetailedReceiptModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          receipt={selectedReceipt}
        />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
              Settled Invoices & Receipts ({receipts.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download tax compliant PDF receipts or view itemized breakdowns
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)}
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState
            title="No receipts available yet"
            description="Once your service jobs are completed and settled, your official payment receipts will appear here."
            icon={FileText}
          />
        ) : (
          <div className="space-y-4">
            {receipts.map((r) => {
              const paymentId = r.payment_id || r.id;
              return (
                <Card
                  key={paymentId}
                  className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-soft hover:shadow-md transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {r.receipt_number || `REC-${r.transaction_id?.slice(-8) || paymentId}`}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                        PAID
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {r.payment_date ? new Date(r.payment_date).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{r.center?.name || 'Authorized Center'}</span>
                      <span>•</span>
                      <span>Vehicle: <strong>{r.vehicle?.plate || 'MH 12'}</strong> ({r.vehicle?.make} {r.vehicle?.model})</span>
                      <span>•</span>
                      <span className="font-mono">Txn: {r.transaction_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right pr-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Settled</span>
                      <span className="font-mono text-lg font-black text-teal-800 dark:text-yellow-signal">
                        ₹{Number(r.amount_paid).toFixed(2)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReceipt(r)}
                      icon={Eye}
                    >
                      View Receipt
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadDirectPdf(r)}
                      icon={Download}
                    >
                      PDF
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
