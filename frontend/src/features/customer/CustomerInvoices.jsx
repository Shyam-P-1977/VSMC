import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText, CreditCard, CheckCircle2, AlertCircle, Download,
  Printer, ArrowRight, ShieldCheck, RefreshCw, X
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, StatusBadge, Modal,
  Input, Select, EmptyState, Skeleton
} from '../../shared/ui';
import { billingApi, paymentApi } from '../../api';

export function CustomerInvoices() {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Payment Form States
  const [payMethod, setPayMethod] = useState('UPI'); // 'UPI' | 'Card' | 'NetBanking'
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [bankName, setBankName] = useState('HDFC Bank');

  // Processing state
  const [paymentState, setPaymentState] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'FAILED' | 'SUCCESS'
  const [failureReason, setFailureReason] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await billingApi.list();
      setInvoices(res.invoices || []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Handle URL parameters (e.g. ?pay=1 or ?view=1)
  useEffect(() => {
    const payId = searchParams.get('pay');
    const viewId = searchParams.get('view');
    if (invoices.length > 0) {
      if (payId) {
        const found = invoices.find(i => String(i.Invoice_ID) === String(payId));
        if (found) handleOpenPay(found);
      } else if (viewId) {
        const found = invoices.find(i => String(i.Invoice_ID) === String(viewId));
        if (found) handleOpenView(found);
      }
    }
  }, [searchParams, invoices]);

  const handleOpenView = async (inv) => {
    try {
      const res = await billingApi.getById(inv.Invoice_ID);
      setSelectedInvoice(res.invoice);
      setViewModalOpen(true);
    } catch {
      toast.error('Could not load invoice details');
    }
  };

  const handleOpenPay = (inv) => {
    setSelectedInvoice(inv);
    setPaymentState('IDLE');
    setFailureReason('');
    setPayModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice) return;

    setPaymentState('PROCESSING');
    setFailureReason('');

    // Prepare payload
    const paymentPayload = {
      invoice_id: selectedInvoice.Invoice_ID,
      method: payMethod,
      details: {
        amount: selectedInvoice.Total_Amount,
        upi_id: upiId,
        card_number: cardNumber.replace(/\s+/g, ''),
        bank_name: bankName
      }
    };

    // Simulate realistic 1.5s gateway handshake latency
    setTimeout(async () => {
      try {
        const res = await paymentApi.process(
          selectedInvoice.Invoice_ID,
          payMethod,
          paymentPayload.details
        );

        setPaymentState('SUCCESS');
        toast.success('Payment completed successfully!');
        
        // Fetch receipt
        if (res.payment?.Payment_ID) {
          const recRes = await paymentApi.getReceipt(res.payment.Payment_ID);
          setCurrentReceipt(recRes.receipt);
        }

        fetchInvoices();
      } catch (err) {
        setPaymentState('FAILED');
        const errDesc = err.response?.data?.error || 'Payment authorization was rejected.';
        setFailureReason(errDesc);
        toast.error(errDesc);
      }
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout
      title="Invoices & Settlements"
      subtitle="View itemized maintenance billing, tax calculations, and settle balances online"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display uppercase tracking-wide font-black text-slate-900 dark:text-white">
              Billing Ledger ({invoices.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standard 18% GST applies to all labour and parts services
            </p>
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="Invoices are generated automatically as soon as technicians complete work orders."
            icon={FileText}
          />
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => (
              <Card
                key={inv.Invoice_ID}
                hoverEffect
                className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-soft"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {inv.Invoice_Number}
                    </span>
                    <StatusBadge status={inv.Status} />
                    <span className="text-xs text-slate-400 font-mono">
                      {inv.Created_At ? new Date(inv.Created_At).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Vehicle: <strong>{inv.Vehicle_Plate}</strong> ({inv.Vehicle_Details})
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                    <span>Labour: ₹{inv.Labour_Charge.toFixed(2)}</span>
                    <span>•</span>
                    <span>Parts: ₹{inv.Parts_Cost.toFixed(2)}</span>
                    <span>•</span>
                    <span>GST (18%): ₹{inv.GST_Amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                    <span className="font-mono text-xl font-black text-slate-900 dark:text-white">
                      ₹{inv.Total_Amount.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenView(inv)}
                  >
                    Itemized Bill
                  </Button>

                  {inv.Status === 'Unpaid' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenPay(inv)}
                      icon={CreditCard}
                    >
                      Pay Online
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Settled
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Itemized Invoice View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        maxWidth="max-w-2xl"
        title={selectedInvoice ? `Invoice ${selectedInvoice.Invoice_Number}` : "Invoice"}
        subtitle="Official VSCMS GST Service Invoice"
      >
        {selectedInvoice && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-teal-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-teal-300 font-bold tracking-widest">
                  Vehicle Service Center Management
                </p>
                <h4 className="text-lg font-bold font-mono mt-0.5">{selectedInvoice.Invoice_Number}</h4>
                <p className="text-[11px] text-teal-200">Date: {new Date(selectedInvoice.Created_At).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedInvoice.Status} />
                <p className="text-xs text-yellow-signal font-mono font-bold mt-2">
                  Total: ₹{selectedInvoice.Total_Amount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Customer & Vehicle */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Billed To</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1">{selectedInvoice.Customer_Name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1 font-mono">{selectedInvoice.Vehicle_Plate}</p>
                <p className="text-[11px] text-slate-500">{selectedInvoice.Vehicle_Details}</p>
              </div>
            </div>

            {/* Labour Entries */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Labour Charges
              </span>
              <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center">Hours</th>
                    <th className="p-2.5 text-center">Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedInvoice.Labour_Entries?.length === 0 ? (
                    <tr><td colSpan={4} className="p-2.5 text-slate-400 text-center">Standard baseline service</td></tr>
                  ) : (
                    selectedInvoice.Labour_Entries?.map((l) => (
                      <tr key={l.ID}>
                        <td className="p-2.5 font-medium">{l.Description}</td>
                        <td className="p-2.5 text-center font-mono">{l.Hours}</td>
                        <td className="p-2.5 text-center font-mono">₹{l.Rate_Per_Hour}</td>
                        <td className="p-2.5 text-right font-mono font-bold">₹{l.Total_Charge.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Parts Used */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                OEM Replacement Parts
              </span>
              <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Part Name</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-center">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedInvoice.Parts_Used?.length === 0 ? (
                    <tr><td colSpan={4} className="p-2.5 text-slate-400 text-center">No spare parts replacement recorded</td></tr>
                  ) : (
                    selectedInvoice.Parts_Used?.map((p) => (
                      <tr key={p.ID}>
                        <td className="p-2.5 font-medium">{p.Part_Name}</td>
                        <td className="p-2.5 text-center font-mono">{p.Quantity}</td>
                        <td className="p-2.5 text-center font-mono">₹{p.Unit_Price_At_Time.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono font-bold">₹{p.Total_Price.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Labour Total:</span>
                <span>₹{selectedInvoice.Labour_Charge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Parts Total:</span>
                <span>₹{selectedInvoice.Parts_Cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">GST Rate:</span>
                <span>{selectedInvoice.GST_Rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">GST Amount (18%):</span>
                <span>₹{selectedInvoice.GST_Amount.toFixed(2)}</span>
              </div>
              {selectedInvoice.Discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span className="font-sans">Discount Rebate:</span>
                  <span>-₹{selectedInvoice.Discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white">
                <span className="font-sans">Grand Total:</span>
                <span className="text-yellow-signal">₹{selectedInvoice.Total_Amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={Printer}
              >
                Print / Download
              </Button>

              {selectedInvoice.Status === 'Unpaid' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setViewModalOpen(false);
                    handleOpenPay(selectedInvoice);
                  }}
                  icon={CreditCard}
                >
                  Pay Online (₹{selectedInvoice.Total_Amount.toFixed(2)})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewModalOpen(false)}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MOCK PAYMENT GATEWAY MODAL */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => {
          if (paymentState !== 'PROCESSING') setPayModalOpen(false);
        }}
        maxWidth="max-w-lg"
        title="Secure Online Payment Gateway"
        subtitle="Simulated realistic UPI / Card payment gateway"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-teal-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[11px] text-teal-300 uppercase font-bold tracking-wider">Payable Balance</p>
                <h4 className="text-2xl font-mono font-black text-yellow-signal">
                  ₹{selectedInvoice.Total_Amount.toFixed(2)}
                </h4>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono text-teal-200">{selectedInvoice.Invoice_Number}</p>
                <p className="text-[11px] text-slate-300 font-mono">{selectedInvoice.Vehicle_Plate}</p>
              </div>
            </div>

            {paymentState === 'IDLE' && (
              <>
                {/* Payment Method Selector */}
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Card', 'NetBanking'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                        payMethod === m
                          ? 'bg-yellow-signal border-yellow-signal text-ink shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Method Specific Form */}
                {payMethod === 'UPI' && (
                  <div className="space-y-3">
                    <Input
                      label="Virtual Payment Address (VPA / UPI ID)"
                      placeholder="e.g. mobile@upi, name@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                      helperText="Hint: UPI ID containing 'fail' tests failure condition"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUpiId('user@okaxis')}
                        className="text-[11px] text-teal-600 dark:text-yellow-signal underline"
                      >
                        Sample Pass (user@okaxis)
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setUpiId('user.fail@paytm')}
                        className="text-[11px] text-rose-500 underline"
                      >
                        Sample Fail (user.fail@paytm)
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === 'Card' && (
                  <div className="space-y-3">
                    <Input
                      label="Card Number"
                      placeholder="4111 2222 3333 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                      helperText="Hint: Card ending in '0000' tests failure condition"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Expiry Date"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                      <Input
                        label="CVV"
                        type="password"
                        placeholder="123"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCardNumber('4111 2222 3333 4242')}
                        className="text-[11px] text-teal-600 dark:text-yellow-signal underline"
                      >
                        Sample Pass (ends 4242)
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setCardNumber('4111 2222 3333 0000')}
                        className="text-[11px] text-rose-500 underline"
                      >
                        Sample Fail (ends 0000)
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === 'NetBanking' && (
                  <div className="space-y-3">
                    <Select
                      label="Select Your Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      options={[
                        { value: 'HDFC Bank', label: 'HDFC Bank' },
                        { value: 'State Bank of India', label: 'State Bank of India (SBI)' },
                        { value: 'ICICI Bank', label: 'ICICI Bank' },
                        { value: 'Axis Bank', label: 'Axis Bank' },
                        { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra Bank' }
                      ]}
                    />
                    <p className="text-xs text-slate-500">
                      You will be redirected to the secure bank portal for authorization simulation.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setPayModalOpen(false)}
                  >
                    Cancel Payment
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleProcessPayment}
                    icon={ShieldCheck}
                  >
                    Authorize ₹{selectedInvoice.Total_Amount.toFixed(2)}
                  </Button>
                </div>
              </>
            )}

            {/* PROCESSING STATE (1.5s simulated delay) */}
            {paymentState === 'PROCESSING' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 border-4 border-teal-600 border-t-yellow-signal rounded-full animate-spin" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Communicating with Gateway...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Encrypting credentials and simulating bank authorization response. Please do not refresh.
                </p>
              </div>
            )}

            {/* FAILED STATE (Offers Retry or Exit) */}
            {paymentState === 'FAILED' && (
              <div className="py-8 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <X className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-rose-600">
                  Transaction Failed
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                  {failureReason || "Authorization failed. Your invoice remains Unpaid."}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setPaymentState('IDLE')}
                    icon={RefreshCw}
                  >
                    Retry With Another Method
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPayModalOpen(false)}
                  >
                    Exit
                  </Button>
                </div>
              </div>
            )}

            {/* SUCCESS STATE */}
            {paymentState === 'SUCCESS' && (
              <div className="py-8 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-emerald-600">
                  Payment Approved!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                  Your payment of ₹{selectedInvoice.Total_Amount.toFixed(2)} was successfully captured. Invoice #{selectedInvoice.Invoice_Number} is marked Paid.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPayModalOpen(false);
                      setReceiptModalOpen(true);
                    }}
                    icon={FileText}
                  >
                    View Official Receipt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPayModalOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* RECEIPT MODAL */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        maxWidth="max-w-md"
        title="Payment Tax Receipt"
        subtitle="Official Settlement Confirmation"
      >
        {currentReceipt && (
          <div className="space-y-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt ID:</span>
                <span className="font-bold">{currentReceipt.receipt_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-bold text-teal-700 dark:text-teal-300">{currentReceipt.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span>{currentReceipt.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span>{currentReceipt.vehicle?.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span>{currentReceipt.payment_method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold">
                <span>Amount Paid:</span>
                <span className="text-emerald-600 font-bold">₹{currentReceipt.amount_paid?.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={Printer}
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReceiptModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
