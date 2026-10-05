from flask import Blueprint, Response, current_app, jsonify, request
from sqlalchemy import update

from extensions import db
from models import Invoice, Payment, PAYMENT_METHODS
from services import billing_service, payment_gateway
from services.notification_service import notify
from utils import ApiError, current_user, get_or_404, json_body, role_required, validation_error

bp = Blueprint("payments", __name__, url_prefix="/api/payments")

ONLINE_METHODS = ("UPI", "Card", "NetBanking")


def _own_payment(pid):
    pay = get_or_404(Payment, pid, "Payment")
    inv = db.session.get(Invoice, pay.invoice_id)
    user = current_user()
    if user.role == "customer" and inv.request.customer_id != user.id:
        raise ApiError("You do not have access to this payment", 403, "forbidden")
    return pay, inv


@bp.post("/initiate")
@role_required("customer")
def initiate():
    d = json_body()
    iid = d.get("invoice_id")
    inv = db.session.get(Invoice, iid) if isinstance(iid, int) else None
    if not inv or inv.request.customer_id != current_user().id:
        raise ApiError("Invoice not found", 404, "not_found")
    if inv.status == "Paid":
        raise ApiError("This invoice is already paid", 409, "already_paid")
    method = d.get("method")
    if method not in ONLINE_METHODS:
        raise validation_error("Choose UPI, Card or NetBanking", "method")
    # abandon any stale initiated attempts
    db.session.execute(update(Payment).where(Payment.invoice_id == inv.id, Payment.status == "Initiated")
                       .values(status="Cancelled", failure_reason="Superseded by a new attempt"))
    pay = Payment(invoice_id=inv.id, amount=inv.payable_total, method=method, status="Initiated")
    db.session.add(pay)
    db.session.commit()
    return jsonify({"payment": pay.to_dict(), "state": "PaymentInitiated"}), 201


@bp.post("/process")
@role_required("customer")
def process():
    d = json_body()
    pid = d.get("payment_id")
    pay, inv = _own_payment(pid) if isinstance(pid, int) else (None, None)
    if not pay:
        raise validation_error("payment_id is required", "payment_id")
    if pay.status != "Initiated":
        raise ApiError(f"This payment is already {pay.status.lower()}. Start a new attempt.", 409, "invalid_state")
    if inv.status == "Paid":
        raise ApiError("This invoice is already paid", 409, "already_paid")
    method = d.get("method") or pay.method
    if method not in ONLINE_METHODS:
        raise validation_error("Choose UPI, Card or NetBanking", "method")
    clean, err, field = payment_gateway.validate_details(method, d.get("details") or d)
    if err:
        raise ApiError(err, 422, "validation_error", field=field)

    # Initiated -> Processing (atomic, prevents double submit)
    res = db.session.execute(update(Payment).where(Payment.id == pay.id, Payment.status == "Initiated")
                             .values(status="Processing", method=method))
    db.session.commit()
    if res.rowcount == 0:
        raise ApiError("This payment is already being processed", 409, "invalid_state")

    result = payment_gateway.charge(method, clean, pay.amount, current_app.config["PAYMENT_DELAY_SECONDS"])
    db.session.refresh(pay)
    db.session.refresh(inv)
    pay.last4 = result.last4
    if result.approved:
        if inv.status == "Paid":  # lost a race against another payment
            pay.status, pay.failure_reason = "Cancelled", "Invoice already paid"
            db.session.commit()
            raise ApiError("This invoice is already paid", 409, "already_paid")
        billing_service.record_payment_success(inv, method, result.transaction_id, result.last4, payment=pay)
        db.session.commit()
        return jsonify({"success": True, "states": result.states, "payment": pay.to_dict(),
                        "invoice": inv.to_dict(),
                        "message": "Payment successful"})
    pay.status, pay.failure_reason, pay.transaction_id = "Failed", result.reason, None
    notify(inv.request.customer_id, f"Payment for invoice {inv.invoice_number} failed: {result.reason}",
           sms=True)
    db.session.commit()
    return jsonify({"success": False, "states": result.states, "payment": pay.to_dict(),
                    "invoice": inv.to_dict(), "message": result.reason, "can_retry": True})


@bp.post("/cancel")
@role_required("customer")
def cancel():
    pid = json_body().get("payment_id")
    pay, inv = _own_payment(pid) if isinstance(pid, int) else (None, None)
    if not pay:
        raise validation_error("payment_id is required", "payment_id")
    if pay.status != "Initiated":
        raise ApiError(f"A {pay.status.lower()} payment cannot be cancelled", 409, "invalid_state")
    pay.status, pay.failure_reason = "Cancelled", "Cancelled by customer"
    db.session.commit()
    return jsonify({"payment": pay.to_dict(), "invoice": inv.to_dict(), "message": "Payment cancelled"})


@bp.get("/<int:pid>/receipt")
@role_required("customer", "admin")
def receipt(pid):
    pay, inv = _own_payment(pid)
    if pay.status != "Success":
        raise ApiError("A receipt is only available for successful payments", 409, "no_receipt")
    if request.args.get("format") == "html":
        return Response(billing_service.render_invoice_html(inv, pay), mimetype="text/html")
    return jsonify({"receipt_number": f"RCT-{inv.invoice_number[4:]}-{pay.id}", "payment": pay.to_dict(),
                    "invoice": inv.to_dict()})
