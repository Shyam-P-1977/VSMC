import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { PageHeader, cx } from '../../components/ui'

const FAQ = [
  ['How do I book a service?', 'Go to Book Service, pick your vehicle, choose one or more services, describe the problem, then select a date and an available time slot. Review the summary and confirm.'],
  ['What if my preferred slot is full?', 'We will show you up to 3 alternate slots (same day first, then the following days) so you can rebook in one click.'],
  ['Can I cancel a booking?', 'Yes — while the request is Pending or Assigned. Once the mechanic has started work, the booking can no longer be cancelled online.'],
  ['How can I track my vehicle?', 'Open My Bookings and select a request to see the live status timeline: Pending → Assigned → In Progress → Completed. You also get a notification for every change.'],
  ['What does "Awaiting Parts" mean?', 'The mechanic needs a spare part that is currently out of stock. The service center has been notified and work resumes as soon as the part arrives.'],
  ['How is my bill calculated?', 'Invoice = labour (hours × rate) + spare parts used + GST (18%) − any discount. The itemised invoice is generated automatically when the job is completed.'],
  ['How do I pay online?', 'Open the Unpaid invoice and press Pay Online. Choose UPI, Card or Net Banking. If a payment fails you can retry or exit — your invoice stays Unpaid and you are never charged twice.'],
  ['Is my card information stored?', 'No. We never store full card numbers or CVV — only the last 4 digits for your receipt.'],
  ['Where can I find past services and receipts?', 'Service History lists every completed job per vehicle. Receipts can be printed or downloaded from the Invoices page.'],
  ['Demo tip: how do I see a failed payment?', 'In this demo gateway, a card number ending in 0000 or a UPI ID containing the word "fail" will be declined.'],
]

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {FAQ.map(([q, a], i) => (
          <div key={q} className="card overflow-hidden">
            <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              {q}<ChevronDown className={cx('h-5 w-5 shrink-0 text-brand-600 transition', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="animate-fade-up border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">{a}</p>}
          </div>
        ))}
      </div>
      <div className="card mt-6 p-5 text-sm text-muted">
        Still stuck? Contact the service center at <b className="text-ink">support@vscms.com</b> or call <b className="text-ink">+91 98765 43210</b> (Mon–Sat, 9:00–18:00).
      </div>
    </div>
  )
}

export default function Help() {
  const { user } = useAuth()
  return (
    <div className={user ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6'}>
      <PageHeader title="Help & FAQ" subtitle="Quick answers to common questions." />
      <Faq />
    </div>
  )
}
