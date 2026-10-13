import React from 'react';
import {
  Printer, Download, CheckCircle2, Building2, User,
  Car, Wrench, ShieldCheck, X, Calendar, Clock, DollarSign
} from 'lucide-react';
import { Button, NumberPlate, Badge } from '../../shared/ui';
import { paymentApi } from '../../api';

export function DetailedReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const paymentId = receipt.payment_id || receipt.id;
  const pdfUrl = paymentId ? paymentApi.getReceiptPdfUrl(paymentId) : null;

  const handleDownloadPdf = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const center = receipt.center || {};
  const customer = receipt.customer || {};
  const vehicle = receipt.vehicle || {};
  const mechanic = receipt.mechanic || {};
  const lineItems = receipt.line_items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto print:p-0 print:bg-white">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 relative print:border-none print:shadow-none print:p-0 print:my-0">
        {/* Close Button (Hidden on Print) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-2xl font-black text-teal-950 dark:text-white uppercase tracking-wider">
                  VSCMS<span className="text-yellow-signal">.</span>
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  | Official Payment Receipt
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {receipt.receipt_number || `REC-${receipt.transaction_id?.slice(-8) || '2026'}`}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Date: {receipt.payment_date || new Date().toLocaleString()}
              </p>
            </div>

            {/* PAID Stamp Badge */}
            <div className="flex flex-col items-start sm:items-end">
              <div className="border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-4 py-1.5 rounded-xl font-display font-black text-lg tracking-widest uppercase rotate-1 shadow-sm">
                PAID IN FULL
              </div>
              <span className="text-[11px] text-slate-400 font-mono mt-1">
                Txn: {receipt.transaction_id || 'TXN-ONLINE-SUCCESS'}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs mb-6">
          {/* Service Center Details */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-yellow-signal block">
              Service Center Details
            </span>
            <p className="font-bold text-sm text-slate-900 dark:text-white">{center.name || 'VSCMS Authorized Center'}</p>
            <p className="text-slate-600 dark:text-slate-300">{center.address || `${center.area}, ${center.city}`}</p>
            <p className="text-slate-600 dark:text-slate-300">Phone: {center.phone || '9876543210'}</p>
            <p className="text-slate-500 font-mono">GSTIN: {center.gstin || '27AABCV1234F1Z5'}</p>
          </div>

          {/* Customer & Vehicle Details */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-yellow-signal block">
              Customer & Vehicle Details
            </span>
            <p className="font-bold text-sm text-slate-900 dark:text-white">{customer.name || 'Valued Customer'}</p>
            <p className="text-slate-600 dark:text-slate-300">Phone: {customer.phone || customer.contact || 'N/A'}</p>
            <div className="pt-1 flex items-center gap-2">
              <NumberPlate registrationNumber={vehicle.plate || vehicle.registration_number || 'MH12AB1234'} size="sm" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {vehicle.make} {vehicle.model} ({vehicle.year || '2022'})
              </span>
            </div>
          </div>
        </div>

        {/* Mechanic Info */}
        {mechanic && (mechanic.name || mechanic.specialization) && (
          <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-900 text-yellow-signal font-bold flex items-center justify-center text-xs">
                {mechanic.name?.charAt(0) || 'M'}
              </div>
              <div>
                <span className="font-bold text-teal-950 dark:text-white block">{mechanic.name}</span>
                <span className="text-[11px] text-teal-700 dark:text-teal-300">
                  Certified Technician • {mechanic.specialization || 'Master Auto Mechanic'}
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              {mechanic.phone && <span>Contact: {mechanic.phone}</span>}
            </div>
          </div>
        )}

        {/* Itemized Table */}
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
            Itemized Services, Replacement Parts & Labour
          </span>
          <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Qty / Hrs</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    Standard Workshop Comprehensive Service Package
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-500">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {item.item_type || 'Service'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{item.description}</td>
                    <td className="p-3 text-center font-mono">{item.quantity || 1}</td>
                    <td className="p-3 text-right font-mono">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{Number(item.amount || (item.quantity * item.unit_price)).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Repair Notes Summary if any */}
        {receipt.repair_notes && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
              Repairs Done / Work Performed Notes:
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
              "{receipt.repair_notes}"
            </p>
          </div>
        )}

        {/* Financial Summary & Totals */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Subtotal (Services + Parts + Labour):</span>
            <span>₹{(receipt.subtotal || (receipt.amount_paid / 1.18)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">GST (18% Integrated Goods & Service Tax):</span>
            <span>₹{(receipt.gst_amount || (receipt.amount_paid - (receipt.amount_paid / 1.18))).toFixed(2)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span className="font-sans">Discount Deduction:</span>
              <span>-₹{Number(receipt.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-bold text-slate-900 dark:text-white font-sans">
            <span>Grand Total Settled:</span>
            <span className="text-teal-700 dark:text-yellow-signal font-mono">
              ₹{Number(receipt.amount_paid || receipt.total_amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-1 font-sans">
            <span>Payment Mode:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{receipt.payment_method || receipt.payment_mode || 'UPI'}</span>
          </div>
        </div>

        {/* Next Service Due Note */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mb-6">
          <span>Service Date: {receipt.service_date || receipt.appointment_date || 'Current Session'}</span>
          <span className="font-semibold text-teal-800 dark:text-yellow-signal">
            Next Service Due: {receipt.next_service_due || '~6 Months or 10,000 km'}
          </span>
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={Printer}
              className="flex-1 sm:flex-initial"
            >
              Print Receipt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              icon={Download}
              className="flex-1 sm:flex-initial"
            >
              Download PDF
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
