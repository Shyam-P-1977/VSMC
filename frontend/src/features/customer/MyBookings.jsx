import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, Wrench, XCircle, ChevronRight,
  FileText, AlertTriangle, Eye, Image as ImageIcon,
  CheckCircle2, AlertCircle, Phone, MapPin, ExternalLink,
  CreditCard, Download, Printer, User, Building2, RefreshCw, Star
} from 'lucide-react';
import { DashboardLayout } from '../../app/layouts/DashboardLayout';
import {
  Card, Button, Badge, StatusBadge, Timeline,
  Modal, ConfirmModal, NumberPlate, EmptyState, Skeleton, Input, Select
} from '../../shared/ui';
import { requestApi, paymentApi, billingApi } from '../../api';
import { DetailedReceiptModal } from './DetailedReceiptModal';

export function MyBookings() {
  const { id: urlBookingId } = useParams();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Payment Modal States
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [paymentState, setPaymentState] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'FAILED' | 'SUCCESS'
  const [failureReason, setFailureReason] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await requestApi.list();
      const list = res.requests || [];
      setRequests(list);

      // If URL has specific booking id, auto open it
      if (urlBookingId) {
        const target = list.find(r => String(r.Request_ID || r.id) === String(urlBookingId));
        if (target) {
          handleOpenDetail(target);
        } else {
          // Fetch directly
          try {
            const single = await requestApi.getById(urlBookingId);
            if (single.request) {
              setSelectedRequest(single.request);
              setDetailModalOpen(true);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [urlBookingId]);

  const handleOpenDetail = async (reqSummary) => {
    try {
      const reqId = reqSummary.Request_ID || reqSummary.id;
      const res = await requestApi.getById(reqId);
      setSelectedRequest(res.request);
      setDetailModalOpen(true);
    } catch {
      toast.error('Could not load booking details');
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedRequest) return;
    try {
      setCancelling(true);
      const reqId = selectedRequest.Request_ID || selectedRequest.id;
      await requestApi.cancel(reqId, "Cancelled by customer");
      toast.success(`Booking #${reqId} cancelled successfully and slot released`);
      setCancelModalOpen(false);
      setDetailModalOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  // Payment trigger for completed jobs
  const handleOpenPayment = (req) => {
    if (!req.Invoice) {
      toast.error('Invoice is being processed by the workshop');
      return;
    }
    setPayInvoice(req.Invoice);
    setPaymentState('IDLE');
    setFailureReason('');
    setPayModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!payInvoice) return;
    const invId = payInvoice.Invoice_ID || payInvoice.id;

    setPaymentState('PROCESSING');
    setFailureReason('');

    setTimeout(async () => {
      try {
        const res = await paymentApi.process(invId, payMethod, {
          amount: payInvoice.Total_Amount || payInvoice.total_amount,
          upi_id: upiId,
          card_number: cardNumber.replace(/\s+/g, '')
        });

        setPaymentState('SUCCESS');
        toast.success('Payment authorized successfully!');

        const paymentId = res.payment?.Payment_ID || res.payment?.id || res.payment_id;
        if (paymentId) {
          const recRes = await paymentApi.getReceipt(paymentId);
          setCurrentReceipt(recRes.receipt);
        }

        // Refresh request details
        if (selectedRequest) {
          const reqId = selectedRequest.Request_ID || selectedRequest.id;
          const fresh = await requestApi.getById(reqId);
          setSelectedRequest(fresh.request);
        }
        fetchBookings();
      } catch (err) {
        setPaymentState('FAILED');
        const errDesc = err.response?.data?.error || 'Payment authorization was rejected.';
        setFailureReason(errDesc);
        toast.error(errDesc);
      }
    }, 1200);
  };

  const handleOpenReceiptModal = async (req) => {
    try {
      let pId = req.Payment?.Payment_ID || req.Payment?.id || req.Invoice?.Payment?.Payment_ID;
      if (!pId && req.Invoice) {
        const invRes = await billingApi.getById(req.Invoice.Invoice_ID || req.Invoice.id);
        pId = invRes.invoice?.Payment?.Payment_ID || invRes.invoice?.Payments?.[0]?.Payment_ID;
      }
      if (pId) {
        const rec = await paymentApi.getReceipt(pId);
        setCurrentReceipt(rec.receipt);
        setReceiptModalOpen(true);
      } else {
        toast.error('Receipt record not found');
      }
    } catch {
      toast.error('Could not load receipt details');
    }
  };

  const statusOptions = [
    'ALL',
    'Pending Approval',
    'Accepted',
    'Assigned',
    'In Progress',
    'Completed',
    'Rejected',
    'Cancelled'
  ];

  const filteredRequests = statusFilter === 'ALL'
    ? requests
    : requests.filter(r => r.Status === statusFilter);

  return (
    <DashboardLayout
      title="My Service Bookings"
      subtitle="Track your work orders, mechanic assignments, and service history"
    >
      <div className="space-y-6">
        {/* Detailed Receipt Modal */}
        <DetailedReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          receipt={currentReceipt}
        />

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-teal-900 text-white dark:bg-yellow-signal dark:text-ink font-bold shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title="No bookings found"
            description="You don't have any service orders matching this status filter."
            icon={Calendar}
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const reqId = req.Request_ID || req.id;
              const isUrgent = req.Urgency === 'Urgent';
              const canCancel = ['Pending Approval', 'Pending', 'Accepted'].includes(req.Status);

              return (
                <Card
                  key={reqId}
                  className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-soft hover:shadow-md transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        Order #{reqId}
                      </span>
                      <StatusBadge status={req.Status} />
                      {isUrgent && (
                        <Badge variant="rose" size="sm">Urgent</Badge>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        {req.Created_At ? new Date(req.Created_At).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {req.Vehicle?.Make} {req.Vehicle?.Model} ({req.Vehicle?.Year})
                      </h4>
                      {req.Vehicle && (
                        <NumberPlate registrationNumber={req.Vehicle.Registration_Number} size="sm" />
                      )}
                    </div>

                    {/* Center Name & Area */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-semibold">{req.Center?.name || req.center?.name || 'Authorized Center'}</span>
                      <span>•</span>
                      <span>{req.Slot?.Date || req.slot?.Date} ({req.Slot?.Start_Time || req.slot?.start_time})</span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xl">
                      {req.Problem_Description || "Standard workshop scheduled inspection"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(req)}
                      icon={Eye}
                    >
                      View Details
                    </Button>

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => {
                          setSelectedRequest(req);
                          setCancelModalOpen(true);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DETAILED BOOKING MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="max-w-2xl"
        title={selectedRequest ? `Work Order #${selectedRequest.Request_ID || selectedRequest.id} Details` : "Booking Details"}
        subtitle="Live inspection logs, center responses, and technician details"
      >
        {selectedRequest && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            {/* Top Status & Vehicle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={selectedRequest.Status} />
                  {selectedRequest.Urgency === 'Urgent' && (
                    <Badge variant="rose" size="sm">Urgent</Badge>
                  )}
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedRequest.Vehicle?.Make} {selectedRequest.Vehicle?.Model} ({selectedRequest.Vehicle?.Year})
                </h4>
              </div>
              {selectedRequest.Vehicle && (
                <NumberPlate registrationNumber={selectedRequest.Vehicle.Registration_Number} size="sm" />
              )}
            </div>

            {/* STEP 6: IF REJECTED -> SHOW RED CARD WITH REASON & REBOOK BUTTONS */}
            {selectedRequest.Status === 'Rejected' && (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-5 h-5" />
                  <span>Appointment Request Declined by Service Center</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-rose-600 dark:text-rose-400">
                    Reason Stated by Workshop:
                  </span>
                  <p className="mt-1 font-semibold text-rose-800 dark:text-rose-100 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                    "{selectedRequest.Rejection_Reason || selectedRequest.rejection_reason || 'Fully booked during this slot window.'}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Note: Your reserved slot was released automatically and no cancellation penalty applies.
                  </p>
                </div>

                {/* Rebook action buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setDetailModalOpen(false);
                      const cId = selectedRequest.Center_ID || selectedRequest.center_id;
                      const vId = selectedRequest.Vehicle_ID || selectedRequest.vehicle_id;
                      navigate(`/customer/book?center_id=${cId}&vehicle_id=${vId}`);
                    }}
                  >
                    Book Another Slot at this Center
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setDetailModalOpen(false);
                      navigate('/customer/centers');
                    }}
                  >
                    Choose Another Service Center
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 6: IF ACCEPTED -> SHOW GREEN CARD */}
            {selectedRequest.Status === 'Accepted' && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Your Appointment is Confirmed!</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  The service center has approved your request and confirmed your time slot.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Time Window</span>
                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedRequest.Slot?.Date} ({selectedRequest.Slot?.Start_Time} - {selectedRequest.Slot?.End_Time})
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Workshop Location</span>
                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedRequest.Center?.name || selectedRequest.center?.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedRequest.Center?.address || selectedRequest.center?.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Phone: <strong>{selectedRequest.Center?.phone || '9876543210'}</strong>
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      (selectedRequest.Center?.name || '') + ' ' + (selectedRequest.Center?.address || '')
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal-700 dark:text-yellow-signal font-bold hover:underline"
                  >
                    <span>Get Directions</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* STEP 6: YOUR MECHANIC CARD (Visible only after assignment) */}
            {selectedRequest.Mechanic && (
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-yellow-signal block">
                  Your Dedicated Mechanic
                </span>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-900 text-yellow-signal flex items-center justify-center font-bold text-base shadow">
                      {selectedRequest.Mechanic.Name?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {selectedRequest.Mechanic.Name}
                      </h4>
                      <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
                        {selectedRequest.Mechanic.Specialization || 'Master Auto Technician'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {selectedRequest.Mechanic.Experience || '5+ Years Experience'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{selectedRequest.Mechanic.Rating || '4.9 ★'}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      Phone: {selectedRequest.Mechanic.Phone || '9876543210'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Center & Slot Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Workshop</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedRequest.Center?.name || selectedRequest.center?.name || 'VSCMS Center'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {selectedRequest.Center?.address || selectedRequest.center?.address}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Appointment Window</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedRequest.Slot?.Date || selectedRequest.slot?.Date}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedRequest.Slot?.Start_Time || selectedRequest.slot?.start_time} - {selectedRequest.Slot?.End_Time || selectedRequest.slot?.end_time}
                </p>
              </div>
            </div>

            {/* Problem Details */}
            <div className="p-4 rounded-2xl bg-yellow-tint/20 dark:bg-yellow-signal/5 border border-yellow-signal/30 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Reported Problem Details
              </span>
              {selectedRequest.Problem_Categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRequest.Problem_Categories.map(c => (
                    <span key={c} className="px-2.5 py-0.5 rounded-full bg-yellow-signal text-ink font-semibold text-[11px]">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {selectedRequest.Problem_Description && (
                <p className="italic text-slate-700 dark:text-slate-300">
                  "{selectedRequest.Problem_Description}"
                </p>
              )}
            </div>

            {/* Diagnostic Photos */}
            {selectedRequest.Attachments?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Problem Photos ({selectedRequest.Attachments.length})
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {selectedRequest.Attachments.map(att => (
                    <div key={att.Attachment_ID} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video">
                      <a
                        href={requestApi.getAttachmentUrl(selectedRequest.Request_ID, att.Attachment_ID)}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-full"
                      >
                        <img
                          src={requestApi.getAttachmentUrl(selectedRequest.Request_ID, att.Attachment_ID)}
                          alt={att.Filename}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: COMPLETED JOB -> ITEMIZED INVOICE & PAY ONLINE */}
            {selectedRequest.Status === 'Completed' && selectedRequest.Invoice && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-yellow-signal">
                    Final GST Invoice (#{selectedRequest.Invoice.Invoice_Number})
                  </span>
                  <StatusBadge status={selectedRequest.Invoice.Status} />
                </div>

                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">Labour:</span>
                    <span>₹{Number(selectedRequest.Invoice.Labour_Charge).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">Parts Used:</span>
                    <span>₹{Number(selectedRequest.Invoice.Parts_Cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">GST (18%):</span>
                    <span>₹{Number(selectedRequest.Invoice.GST_Amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-sm">
                    <span className="font-sans">Grand Total:</span>
                    <span className="text-teal-700 dark:text-yellow-signal font-mono">
                      ₹{Number(selectedRequest.Invoice.Total_Amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  {selectedRequest.Invoice.Status === 'Unpaid' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenPayment(selectedRequest)}
                      icon={CreditCard}
                    >
                      Pay Online (₹{Number(selectedRequest.Invoice.Total_Amount).toFixed(2)})
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReceiptModal(selectedRequest)}
                      icon={FileText}
                    >
                      View Payment Receipt
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Live Milestone Timeline */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Milestone Status Timeline
              </span>
              <Timeline events={selectedRequest.Status_History || []} />
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {['Pending Approval', 'Pending', 'Accepted'].includes(selectedRequest.Status) ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel Booking
                </Button>
              ) : <div />}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* ONLINE PAYMENT MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => {
          if (paymentState !== 'PROCESSING') setPayModalOpen(false);
        }}
        maxWidth="max-w-md"
        title="Secure Online Payment"
        subtitle="Settle your service invoice via UPI, Card, or NetBanking"
      >
        {payInvoice && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-2xl bg-teal-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] text-teal-300 uppercase font-bold tracking-wider">Payable Balance</p>
                <h4 className="text-2xl font-mono font-black text-yellow-signal">
                  ₹{Number(payInvoice.Total_Amount).toFixed(2)}
                </h4>
              </div>
              <span className="text-xs font-mono text-teal-200">{payInvoice.Invoice_Number}</span>
            </div>

            {paymentState === 'IDLE' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Card', 'NetBanking'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        payMethod === m
                          ? 'bg-yellow-signal border-yellow-signal text-ink shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {payMethod === 'UPI' && (
                  <div className="space-y-2">
                    <Input
                      label="UPI ID"
                      placeholder="e.g. mobile@upi, customer@oksbi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setUpiId('customer@okaxis')}
                        className="text-teal-600 dark:text-yellow-signal underline"
                      >
                        Sample Pass (customer@okaxis)
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setUpiId('test.fail@upi')}
                        className="text-rose-500 underline"
                      >
                        Sample Fail (test.fail@upi)
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === 'Card' && (
                  <div className="space-y-2">
                    <Input
                      label="Card Number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      helperText="Hint: Card ending in '0000' tests failure condition"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Expiry"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                      <Input
                        label="CVV"
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCardNumber('4111 2222 3333 4242')}
                        className="text-teal-600 dark:text-yellow-signal underline"
                      >
                        Sample Pass (...4242)
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setCardNumber('4111 2222 3333 0000')}
                        className="text-rose-500 underline"
                      >
                        Sample Fail (...0000)
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === 'NetBanking' && (
                  <p className="text-slate-500 text-xs">
                    Simulated redirection to HDFC / SBI NetBanking portal. Click authorize to settle balance.
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" onClick={() => setPayModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleProcessPayment}>
                    Authorize ₹{Number(payInvoice.Total_Amount).toFixed(2)}
                  </Button>
                </div>
              </>
            )}

            {paymentState === 'PROCESSING' && (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-yellow-signal rounded-full animate-spin mx-auto" />
                <p className="font-bold text-slate-800 dark:text-slate-200">Processing transaction...</p>
              </div>
            )}

            {paymentState === 'FAILED' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <XCircle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-rose-600">Transaction Failed</h4>
                <p className="text-slate-500">{failureReason || 'Declined by gateway.'}</p>
                <div className="pt-2">
                  <Button variant="primary" onClick={() => setPaymentState('IDLE')} icon={RefreshCw}>
                    Retry Payment
                  </Button>
                </div>
              </div>
            )}

            {paymentState === 'SUCCESS' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-emerald-600">Payment Approved!</h4>
                <p className="text-slate-500">Invoice settled. You can now download or view your official receipt.</p>
                <div className="pt-2 flex justify-center gap-2">
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
                  <Button variant="outline" onClick={() => setPayModalOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this booking? This will immediately release the reserved slot at the service center."
        confirmText="Yes, Cancel Booking"
        isDanger={true}
        isLoading={cancelling}
      />
    </DashboardLayout>
  );
}
