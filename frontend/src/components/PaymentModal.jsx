import { useState } from 'react'
import { CreditCard, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../api'
import { apiError } from '../api/client'
import { Button, Input, Modal, cx } from './ui'

export default function PaymentModal({ invoice, open, onClose, onDone }) {
  const [method, setMethod] = useState('Card')
  const [busy, setBusy] = useState(false)
  const [details, setDetails] = useState({ upi_id: '', card_number: '', expiry: '', cvv: '' })

  const handlePay = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { payment } = await api.payments.initiate(invoice.id, method)
      
      const p = {
        payment_id: payment.id,
        ...(method === 'UPI' ? { upi_id: details.upi_id } : { card_number: details.card_number })
      }
      
      await api.payments.process(p)
      
      toast.success('Payment successful!')
      onDone?.()
      onClose()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pay Invoice ${invoice?.invoice_number}`}>
      <form id="payment-form" onSubmit={handlePay} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setMethod('Card')} className={cx('flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition', method === 'Card' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-muted hover:border-brand-500/50')}>
            <CreditCard className="h-5 w-5" /> Card
          </button>
          <button type="button" onClick={() => setMethod('UPI')} className={cx('flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition', method === 'UPI' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-muted hover:border-brand-500/50')}>
            <Smartphone className="h-5 w-5" /> UPI
          </button>
        </div>

        {method === 'Card' ? (
          <div className="space-y-3">
            <Input label="Card Number" required value={details.card_number} onChange={(e) => setDetails({ ...details, card_number: e.target.value })} placeholder="4111 1111 1111 1111" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Expiry (MM/YY)" required value={details.expiry} onChange={(e) => setDetails({ ...details, expiry: e.target.value })} placeholder="12/25" />
              <Input label="CVV" required value={details.cvv} onChange={(e) => setDetails({ ...details, cvv: e.target.value })} placeholder="123" />
            </div>
          </div>
        ) : (
          <Input label="UPI ID" required value={details.upi_id} onChange={(e) => setDetails({ ...details, upi_id: e.target.value })} placeholder="username@upi" />
        )}
      </form>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="payment-form" loading={busy}>Pay ₹{invoice?.payable_total}</Button>
      </div>
    </Modal>
  )
}
