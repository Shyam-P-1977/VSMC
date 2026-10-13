import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, DollarSign, CheckCircle2, Clock, AlertCircle,
  Search, Eye, PlusCircle, CreditCard, Download, ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, StatusBadge, Modal,
  Input, Select, Textarea, Skeleton
} from '../../shared/ui';
import { billingApi } from '../../api';

export function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // View / Detail Modal
  const [viewInvoice, setViewInvoice] = useState(null);

  // Manual Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [processingPay, setProcessingPay] = useState(false);

  // Adjustment Modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjInvoice, setAdjInvoice] = useState(null);
  const [adjReason, setAdjReason] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [savingAdj, setSavingAdj] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await billingApi.list(statusFilter);
      setInvoices(res.invoices || []);
    } catch {
      toast.error('Failed to load workshop invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleOpenDetail = async (inv) => {
    try {
      const res = await billingApi.getById(inv.Invoice_ID);
      setViewInvoice(res.invoice);
    } catch {
      setViewInvoice(inv);
    }
  };

  const handleOpenPay = (inv) => {
    setPayingInvoice(inv);
    setPayMethod('Cash');
    setPayNotes(`Admin cash counter collection for INV-${inv.Invoice_Number}`);
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payingInvoice) return;
    try {
      setProcessingPay(true);
      await billingApi.markPaid(payingInvoice.Invoice_ID, payMethod, payNotes);
      toast.success(`Invoice #${payingInvoice.Invoice_Number} marked as Paid via ${payMethod}`);
      setPayModalOpen(false);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setProcessingPay(false);
    }
  };

  const handleOpenAdj = (inv) => {
    setAdjInvoice(inv);
    setAdjReason('');
    setAdjAmount('');
    setAdjModalOpen(true);
  };

  const handleAdjSubmit = async (e) => {
    e.preventDefault();
    if (!adjInvoice || !adjReason || !adjAmount) {
      toast.error('Please specify adjustment reason and amount');
      return;
    }
    try {
      setSavingAdj(true);
      await billingApi.addAdjustment(adjInvoice.Invoice_ID, adjReason, parseFloat(adjAmount));
      toast.success('Adjustment successfully applied to invoice');
      setAdjModalOpen(false);
      fetchInvoices();
      if (viewInvoice && viewInvoice.Invoice_ID === adjInvoice.Invoice_ID) {
        const updated = await billingApi.getById(adjInvoice.Invoice_ID);
        setViewInvoice(updated.invoice);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply adjustment');
    } finally {
      setSavingAdj(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    const invMatch = inv.Invoice_Number?.toLowerCase().includes(q);
    const clientMatch = inv.Customer?.Name?.toLowerCase().includes(q) || inv.Customer?.Email?.toLowerCase().includes(q);
    const reqMatch = String(inv.Request_ID).includes(q);
    return invMatch || clientMatch || reqMatch;
  });

  return (
    <DashboardLayout
      title="Invoices & Collections"
      subtitle="GST billing records, cash receipts, payment gateway reconciliation, and adjustments"
    >
      <div className="space-y-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === ''
                  ? 'bg-teal-900 text-white shadow-sm dark:bg-signal-yellow dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setStatusFilter('Unpaid')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'Unpaid'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Unpaid Dues
            </button>
            <button
              onClick={() => setStatusFilter('Paid')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'Paid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Settled / Paid
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search invoice #, customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-white">No Invoices Found</h3>
            <p className="text-sm text-neutral-500 mt-1">Invoices are automatically generated once technicians complete jobs.</p>
          </Card>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Work Order</th>
                    <th className="py-3.5 px-4">Labour & Parts</th>
                    <th className="py-3.5 px-4">GST (18%)</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {filteredInvoices.map(inv => {
                    const isPaid = inv.Status === 'Paid';

                    return (
                      <tr key={inv.Invoice_ID} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-800 dark:text-teal-300">
                          #{inv.Invoice_Number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {inv.Customer?.Name || 'Client'}
                          </div>
                          <div className="text-xs text-neutral-500">{inv.Customer?.Contact}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          Order #{inv.Request_ID}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div>Labour: ₹{inv.Labour_Charge?.toLocaleString('en-IN')}</div>
                          <div className="text-neutral-500">Parts: ₹{inv.Parts_Cost?.toLocaleString('en-IN')}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">
                          ₹{inv.GST_Amount?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-900 dark:text-teal-200">
                          ₹{inv.Total_Amount?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={isPaid ? 'success' : 'danger'}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenDetail(inv)}
                              className="text-xs py-1 px-2.5 h-auto"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>

                            {!isPaid && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenPay(inv)}
                                className="text-xs py-1 px-2.5 h-auto"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Record Pay
                              </Button>
                            )}

                            {isPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAdj(inv)}
                                className="text-xs py-1 px-2.5 h-auto"
                              >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                Adjustment
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Invoice Breakdown Modal */}
        <Modal
          isOpen={!!viewInvoice}
          onClose={() => setViewInvoice(null)}
          title={`Tax Invoice #${viewInvoice?.Invoice_Number}`}
        >
          {viewInvoice && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase">Settlement Status</div>
                  <Badge variant={viewInvoice.Status === 'Paid' ? 'success' : 'danger'} className="mt-1">
                    {viewInvoice.Status}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase">Gross Payable</div>
                  <div className="text-xl font-bold font-mono text-teal-900 dark:text-teal-200">
                    ₹{viewInvoice.Total_Amount?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Technician Labour Charges</span>
                  <span className="font-mono font-semibold">₹{viewInvoice.Labour_Charge?.toLocaleString('en-IN')}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Spare Parts & Components Cost</span>
                  <span className="font-mono font-semibold">₹{viewInvoice.Parts_Cost?.toLocaleString('en-IN')}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">GST (18% Integrated Goods & Service Tax)</span>
                  <span className="font-mono font-semibold">₹{viewInvoice.GST_Amount?.toLocaleString('en-IN')}</span>
                </div>
                {viewInvoice.Discount > 0 && (
                  <div className="py-2.5 flex justify-between text-emerald-600 font-semibold">
                    <span>Loyalty / Special Discount</span>
                    <span className="font-mono">- ₹{viewInvoice.Discount?.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Adjustments history if any */}
              {viewInvoice.Adjustments && viewInvoice.Adjustments.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="text-xs font-bold text-neutral-500 uppercase">Post-Billing Adjustments</div>
                  {viewInvoice.Adjustments.map(adj => (
                    <div key={adj.ID} className="flex justify-between text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">{adj.Reason}</span>
                      <span className={`font-mono font-semibold ${adj.Amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {adj.Amount > 0 ? `+ ₹${adj.Amount}` : `- ₹${Math.abs(adj.Amount)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Details if Paid */}
              {viewInvoice.Payment && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs font-bold text-neutral-500 uppercase mb-1">Receipt Transaction Info</div>
                  <div className="text-xs text-neutral-700 dark:text-neutral-300">
                    Method: <strong className="uppercase">{viewInvoice.Payment.Method}</strong> | TXN: <code className="font-mono">{viewInvoice.Payment.Transaction_ID}</code>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Timestamp: {viewInvoice.Payment.Created_At}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Print Receipt
                </Button>
                <Button variant="ghost" onClick={() => setViewInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Record Manual Payment Modal */}
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Record Payment for Invoice #${payingInvoice?.Invoice_Number}`}
        >
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Record a counter payment collected in cash or swipe terminal for total amount <strong className="text-teal-800 dark:text-teal-300">₹{payingInvoice?.Total_Amount?.toLocaleString('en-IN')}</strong>.
            </p>

            <Select
              label="Payment Method"
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              options={[
                { value: 'Cash', label: 'Cash (Workshop Counter)' },
                { value: 'Card', label: 'POS Terminal (Credit/Debit Card)' },
                { value: 'UPI', label: 'Direct UPI QR Scan' },
                { value: 'NetBanking', label: 'Direct Bank NEFT/RTGS' }
              ]}
            />

            <Input
              label="Internal Receipt Notes"
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
              placeholder="e.g. Received at desk from customer"
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={processingPay}>
                Confirm Payment
              </Button>
            </div>
          </form>
        </Modal>

        {/* Adjustment Modal (for Paid Invoices) */}
        <Modal
          isOpen={adjModalOpen}
          onClose={() => setAdjModalOpen(false)}
          title={`Record Adjustment on Invoice #${adjInvoice?.Invoice_Number}`}
        >
          <form onSubmit={handleAdjSubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
              <ShieldCheck className="w-4 h-4 inline mr-1" />
              <strong>Audit Rule:</strong> Settled invoices cannot be modified or deleted directly. Official adjustments ensure complete tax audit trails.
            </div>

            <Input
              label="Adjustment Reason"
              required
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              placeholder="e.g. Goodwill rebate for delayed part or warranty concession"
            />

            <Input
              label="Adjustment Amount (₹, use negative for discount/refund)"
              type="number"
              step="0.01"
              required
              value={adjAmount}
              onChange={e => setAdjAmount(e.target.value)}
              placeholder="-250.00"
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={() => setAdjModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingAdj}>
                Apply Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
