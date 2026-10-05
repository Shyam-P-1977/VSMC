from flask import Blueprint, Response, jsonify, request
from sqlalchemy import or_

from extensions import db
from models import Invoice, ServiceRequest, User, Vehicle
from services import billing_service
from utils import (ApiError, clean_str, current_user, get_or_404, json_body, paginate, role_required,
                   to_number)

bp = Blueprint("invoices", __name__, url_prefix="/api/invoices")


def _load(iid):
    inv = get_or_404(Invoice, iid, "Invoice")
    user = current_user()
    if user.role == "customer" and inv.request.customer_id != user.id:
        raise ApiError("You do not have access to this invoice", 403, "forbidden")
    return inv


@bp.get("")
@role_required("customer", "admin")
def list_invoices():
    user = current_user()
    q = (Invoice.query.join(ServiceRequest, Invoice.request_id == ServiceRequest.id)
         .join(User, ServiceRequest.customer_id == User.id)
         .join(Vehicle, ServiceRequest.vehicle_id == Vehicle.id))
    if user.role == "customer":
        q = q.filter(ServiceRequest.customer_id == user.id)
    a = request.args
    if a.get("status") in ("Paid", "Unpaid"):
        q = q.filter(Invoice.status == a["status"])
    if a.get("q") and user.role == "admin":
        t = f"%{a['q'].strip()}%"
        q = q.filter(or_(Invoice.invoice_number.ilike(t), User.name.ilike(t),
                         Vehicle.registration_number.ilike(t.replace(" ", ""))))
    q = q.order_by(Invoice.id.desc())
    return jsonify(paginate(q, lambda i: i.to_dict(detail=False)))


@bp.get("/<int:iid>")
@role_required("customer", "admin")
def get_invoice(iid):
    return jsonify(_load(iid).to_dict())


@bp.get("/<int:iid>/download")
@role_required("customer", "admin")
def download(iid):
    inv = _load(iid)
    html = billing_service.render_invoice_html(inv, inv.paid_payment if inv.status == "Paid" else None)
    resp = Response(html, mimetype="text/html")
    resp.headers["Content-Disposition"] = f'inline; filename="{inv.invoice_number}.html"'
    return resp


@bp.put("/<int:iid>")
@role_required("admin")
def update_invoice(iid):
    inv = get_or_404(Invoice, iid, "Invoice")
    d = json_body()
    discount = to_number(d, "discount", "Discount", minimum=0)
    return jsonify(billing_service.set_discount(inv, discount).to_dict())


@bp.delete("/<int:iid>")
@role_required("admin")
def delete_invoice(iid):
    inv = get_or_404(Invoice, iid, "Invoice")
    billing_service.delete_invoice(inv)
    return jsonify({"message": "Invoice deleted"})


@bp.post("/<int:iid>/adjustment")
@role_required("admin")
def adjustment(iid):
    inv = get_or_404(Invoice, iid, "Invoice")
    d = json_body()
    reason = clean_str(d, "reason", "Reason", max_len=300, min_len=3)
    amount = to_number(d, "amount", "Amount", minimum=-10000000, maximum=10000000)
    billing_service.add_adjustment(inv, reason, amount, current_user())
    return jsonify(inv.to_dict()), 201


@bp.post("/<int:iid>/mark-paid")
@role_required("admin")
def mark_paid(iid):
    inv = get_or_404(Invoice, iid, "Invoice")
    method = (request.get_json(silent=True) or {}).get("method", "Cash")
    payment = billing_service.mark_paid_manual(inv, method, current_user())
    return jsonify({"payment": payment.to_dict(), "invoice": inv.to_dict()})
