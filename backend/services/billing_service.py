"""Billing: charge calculation, invoice generation, adjustments, payment recording, printable docs."""
import random
from decimal import ROUND_HALF_UP, Decimal
from html import escape

from extensions import db
from models import Invoice, InvoiceAdjustment, Payment, get_setting, money, utcnow
from services.notification_service import notify
from utils import ApiError, validation_error

D = Decimal
CENT = D("0.01")


def _q(x):
    return x.quantize(CENT, rounding=ROUND_HALF_UP)


def compute_charges(labour, parts, gst_rate, discount=0):
    """labour: iterable with hours/rate_per_hour; parts: iterable with quantity/unit_price_at_time."""
    labour_charge = _q(sum((D(str(l.hours)) * D(str(l.rate_per_hour)) for l in labour), D(0)))
    parts_cost = _q(sum((D(str(p.quantity)) * D(str(p.unit_price_at_time)) for p in parts), D(0)))
    subtotal = labour_charge + parts_cost
    gst_amount = _q(subtotal * D(str(gst_rate)) / D(100))
    total = subtotal + gst_amount - D(str(discount))
    result = {"labour_charge": float(labour_charge), "parts_cost": float(parts_cost),
              "subtotal": float(subtotal), "gst_amount": float(gst_amount), "total_amount": float(total)}
    # independent verification of the calculation (BR-13c)
    f_sub = sum(l.hours * l.rate_per_hour for l in labour) + sum(p.quantity * p.unit_price_at_time for p in parts)
    f_total = f_sub + f_sub * float(gst_rate) / 100 - float(discount)
    if abs(f_total - result["total_amount"]) > 0.05:
        raise ApiError("Invoice calculation verification failed", 500, "calculation_error")
    return result


def _next_invoice_number():
    prefix = f"INV-{utcnow().year}-"
    last = (Invoice.query.filter(Invoice.invoice_number.like(prefix + "%"))
            .order_by(Invoice.invoice_number.desc()).first())
    seq = int(last.invoice_number.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


def generate_invoice(req, discount=0):
    if req.invoice:
        return req.invoice
    gst_rate = float(get_setting("gst_rate"))
    c = compute_charges(req.labour, req.parts_used, gst_rate, discount)
    inv = Invoice(request_id=req.id, invoice_number=_next_invoice_number(), labour_charge=c["labour_charge"],
                  parts_cost=c["parts_cost"], gst_rate=gst_rate, gst_amount=c["gst_amount"], discount=discount,
                  total_amount=c["total_amount"], status="Unpaid")
    db.session.add(inv)
    db.session.flush()
    db.session.refresh(req)
    return inv


def _assert_mutable(inv):
    if inv.status == "Paid" or inv.paid_payment:
        raise ApiError("A paid invoice cannot be edited or deleted. Use an adjustment instead.", 409,
                       "paid_invoice_locked")


def set_discount(inv, discount):
    _assert_mutable(inv)
    if discount < 0:
        raise validation_error("Discount cannot be negative", "discount")
    c = compute_charges(inv.request.labour, inv.request.parts_used, inv.gst_rate, discount)
    if c["total_amount"] < 0:
        raise validation_error("Discount cannot exceed the invoice amount", "discount")
    inv.discount = discount
    inv.total_amount = c["total_amount"]
    db.session.commit()
    return inv


def delete_invoice(inv):
    _assert_mutable(inv)
    for p in inv.payments:
        db.session.delete(p)
    db.session.delete(inv)
    db.session.commit()


def add_adjustment(inv, reason, amount, user):
    if not amount:
        raise validation_error("Adjustment amount cannot be zero", "amount")
    if inv.payable_total + amount < 0:
        raise validation_error("Adjustment would make the invoice total negative", "amount")
    adj = InvoiceAdjustment(invoice_id=inv.id, reason=reason, amount=amount, created_by=user.id)
    db.session.add(adj)
    notify(inv.request.customer_id,
           f"Invoice {inv.invoice_number} was adjusted by Rs. {amount:+.2f}: {reason}", email=True)
    db.session.commit()
    return adj


def new_manual_txn():
    return "MAN" + "".join(random.choice("0123456789") for _ in range(10))


def record_payment_success(inv, method, transaction_id, last4=None, payment=None, actor_id=None, manual=False):
    """Mark invoice Paid and persist a successful payment (shared by online + manual payments)."""
    from services.booking_service import add_history, label
    if inv.status == "Paid":
        raise ApiError("Invoice is already paid", 409, "already_paid")
    amount = inv.payable_total
    if payment is None:
        payment = Payment(invoice_id=inv.id)
        db.session.add(payment)
    payment.amount, payment.method, payment.transaction_id = amount, method, transaction_id
    payment.status, payment.last4, payment.failure_reason = "Success", last4, None
    inv.status = "Paid"
    req = inv.request
    add_history(req, req.status, actor_id or req.customer_id,
                f"Payment of Rs. {amount:.2f} received via {method} ({transaction_id})")
    notify(req.customer_id, f"Payment of Rs. {amount:.2f} received for invoice {inv.invoice_number} "
                            f"(Txn {transaction_id}). Thank you!", sms=True, email=True)
    return payment


def mark_paid_manual(inv, method, admin):
    if method not in ("Cash", "Card", "UPI", "NetBanking"):
        raise validation_error("Payment method must be Cash, Card, UPI or NetBanking", "method")
    payment = record_payment_success(inv, method, new_manual_txn(), actor_id=admin.id, manual=True)
    db.session.commit()
    return payment


# ---- printable documents -------------------------------------------------------------
_CSS = """body{font-family:Segoe UI,Arial,sans-serif;color:#1e293b;max-width:800px;margin:24px auto;padding:0 16px}
h1{margin:0;color:#4338ca}table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:14px}th{background:#f1f5f9}
.r{text-align:right}.top{display:flex;justify-content:space-between;align-items:flex-start}
.badge{display:inline-block;padding:3px 12px;border-radius:999px;font-weight:600;font-size:13px}
.Paid{background:#dcfce7;color:#166534}.Unpaid{background:#fee2e2;color:#991b1b}
.tot td{font-weight:700;font-size:16px}.muted{color:#64748b;font-size:13px}
@media print{.noprint{display:none}}"""


def _row(cells, right_from=1):
    return "<tr>" + "".join(f'<td class="{"r" if i >= right_from else ""}">{escape(str(c))}</td>'
                            for i, c in enumerate(cells)) + "</tr>"


def render_invoice_html(inv, receipt_payment=None):
    r = inv.request
    is_receipt = receipt_payment is not None
    title = "Payment Receipt" if is_receipt else "Tax Invoice"
    labour = "".join(_row([l.description, f"{l.hours:g} h", f"Rs. {l.rate_per_hour:.2f}",
                           f"Rs. {l.hours * l.rate_per_hour:.2f}"]) for l in r.labour)
    parts = "".join(_row([p.part.name, p.quantity, f"Rs. {p.unit_price_at_time:.2f}",
                          f"Rs. {p.quantity * p.unit_price_at_time:.2f}"]) for p in r.parts_used)
    adjustments = "".join(_row([a.reason, "", "", f"Rs. {a.amount:+.2f}"]) for a in inv.adjustments)
    pay = ""
    if is_receipt:
        pay = (f'<p><b>Payment:</b> {escape(receipt_payment.method or "")} &middot; Txn '
               f'{escape(receipt_payment.transaction_id or "")}'
               f'{" &middot; Card ending " + escape(receipt_payment.last4) if receipt_payment.last4 else ""}'
               f' &middot; {receipt_payment.created_at:%d %b %Y %H:%M} UTC</p>')
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{title} {escape(inv.invoice_number)}</title>
<style>{_CSS}</style></head><body>
<div class="top"><div><h1>VSCMS Auto Care</h1><div class="muted">Vehicle Service Center &middot; {title}</div></div>
<div class="r"><div><b>{escape(inv.invoice_number)}</b></div><div class="muted">{inv.created_at:%d %b %Y}</div>
<span class="badge {inv.status}">{inv.status}</span></div></div>
<p><b>Customer:</b> {escape(r.customer.name)} &middot; {escape(r.customer.contact)}<br>
<b>Vehicle:</b> {escape(r.vehicle.make)} {escape(r.vehicle.model)} ({escape(r.vehicle.registration_number)})<br>
<b>Services:</b> {escape(", ".join(i.service.name for i in r.items))}</p>
<table><tr><th>Labour</th><th class="r">Hours</th><th class="r">Rate</th><th class="r">Amount</th></tr>{labour}</table>
<table><tr><th>Spare parts</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
{parts or '<tr><td colspan="4" class="muted">No parts used</td></tr>'}</table>
<table>
{_row(["Labour charge", "", "", f"Rs. {inv.labour_charge:.2f}"])}
{_row(["Parts cost", "", "", f"Rs. {inv.parts_cost:.2f}"])}
{_row([f"GST ({inv.gst_rate:g}%)", "", "", f"Rs. {inv.gst_amount:.2f}"])}
{_row(["Discount", "", "", f"- Rs. {inv.discount:.2f}"])}
{adjustments}
<tr class="tot"><td colspan="3">Total {"paid" if inv.status == "Paid" else "payable"}</td>
<td class="r">Rs. {inv.payable_total:.2f}</td></tr></table>{pay}
<p class="muted">Thank you for choosing VSCMS Auto Care. This is a computer generated document.</p>
<p class="noprint"><button onclick="window.print()">Print</button></p></body></html>"""
