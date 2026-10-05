import secrets
from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from blueprints.auth import ensure_unique
from extensions import db
from models import (DEFAULT_SETTINGS, Invoice, MECHANIC_ACTIVE_STATUSES, Mechanic, Payment, ServiceRequest,
                    SparePart, User, Vehicle, get_setting, set_setting)
from utils import (ApiError, clean_str, get_or_404, json_body, paginate, role_required, to_number,
                   validate_contact, validate_email, validate_password, validation_error)

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def temp_password():
    return secrets.token_urlsafe(6) + "A1!"


# ---- dashboard ---------------------------------------------------------------------
@bp.get("/dashboard")
@role_required("admin")
def dashboard():
    today = date.today()
    month_start = datetime(today.year, today.month, 1)
    pending = ServiceRequest.query.filter_by(status="Pending").count()
    active = ServiceRequest.query.filter(ServiceRequest.status.in_(MECHANIC_ACTIVE_STATUSES)).count()
    revenue = (db.session.query(func.coalesce(func.sum(Payment.amount), 0))
               .filter(Payment.status == "Success", Payment.created_at >= month_start).scalar())
    low = SparePart.query.filter(SparePart.quantity_in_stock < SparePart.min_threshold).count()
    unpaid = Invoice.query.filter_by(status="Unpaid").count()
    monthly = []
    y, m = today.year, today.month
    for i in range(5, -1, -1):
        mm, yy = m - i, y
        while mm < 1:
            mm, yy = mm + 12, yy - 1
        s = datetime(yy, mm, 1)
        e = datetime(yy + (mm == 12), (mm % 12) + 1, 1)
        v = (db.session.query(func.coalesce(func.sum(Payment.amount), 0))
             .filter(Payment.status == "Success", Payment.created_at >= s, Payment.created_at < e).scalar())
        monthly.append({"month": s.strftime("%b %Y"), "revenue": round(v, 2)})
    status_counts = dict(db.session.query(ServiceRequest.status, func.count()).group_by(ServiceRequest.status).all())
    return jsonify({
        "kpis": {"pending_requests": pending, "active_jobs": active, "revenue_this_month": round(revenue, 2),
                 "low_stock_count": low, "unpaid_invoices": unpaid,
                 "available_mechanics": Mechanic.query.filter_by(is_available=True).count(),
                 "total_customers": User.query.filter_by(role="customer").count()},
        "charts": {"monthly_revenue": monthly,
                   "status_breakdown": [{"name": k, "value": v} for k, v in status_counts.items()]}})


# ---- settings ----------------------------------------------------------------------
@bp.get("/settings")
@role_required("admin")
def get_settings():
    return jsonify({k: get_setting(k) for k in DEFAULT_SETTINGS})


@bp.put("/settings")
@role_required("admin")
def update_settings():
    d = json_body()
    if "gst_rate" in d:
        set_setting("gst_rate", to_number(d, "gst_rate", "GST rate", minimum=0, maximum=100))
    if "default_slot_capacity" in d:
        set_setting("default_slot_capacity", to_number(d, "default_slot_capacity", "Default slot capacity",
                                                       minimum=1, maximum=100, integer=True))
    if "labour_rate" in d:
        set_setting("labour_rate", to_number(d, "labour_rate", "Labour rate", minimum=0, maximum=100000))
    db.session.commit()
    return jsonify({k: get_setting(k) for k in DEFAULT_SETTINGS})


# ---- customers ---------------------------------------------------------------------
def _customer_dict(u):
    d = u.to_dict()
    d["vehicle_count"] = Vehicle.query.filter_by(customer_id=u.id).count()
    d["request_count"] = ServiceRequest.query.filter_by(customer_id=u.id).count()
    return d


@bp.get("/customers")
@role_required("admin")
def list_customers():
    q = User.query.filter_by(role="customer")
    if request.args.get("q"):
        t = f"%{request.args['q'].strip()}%"
        q = q.filter(or_(User.name.ilike(t), User.email.ilike(t), User.contact.like(t)))
    return jsonify(paginate(q.order_by(User.id.desc()), _customer_dict))


@bp.post("/customers")
@role_required("admin")
def create_customer():
    d = json_body()
    u = User(role="customer", name=clean_str(d, "name", "Name", max_len=120, min_len=2),
             email=validate_email(d.get("email")), contact=validate_contact(d.get("contact")),
             address=clean_str(d, "address", "Address", required=False, max_len=300))
    ensure_unique(u.email, u.contact)
    pw = d.get("password") or temp_password()
    u.set_password(validate_password(pw))
    db.session.add(u)
    db.session.commit()
    return jsonify({**_customer_dict(u), "temp_password": None if d.get("password") else pw}), 201


@bp.put("/customers/<int:uid>")
@role_required("admin")
def update_customer(uid):
    u = get_or_404(User, uid, "Customer")
    if u.role != "customer":
        raise ApiError("Customer not found", 404, "not_found")
    d = json_body()
    if "name" in d:
        u.name = clean_str(d, "name", "Name", max_len=120, min_len=2)
    if "contact" in d:
        u.contact = validate_contact(d["contact"])
        ensure_unique(contact=u.contact, exclude_id=u.id)
    if "address" in d:
        u.address = clean_str(d, "address", "Address", required=False, max_len=300)
    if "is_active" in d:
        u.is_active = bool(d["is_active"])
    db.session.commit()
    return jsonify(_customer_dict(u))


# ---- mechanics ---------------------------------------------------------------------
def _active_jobs(m):
    return ServiceRequest.query.filter(ServiceRequest.mechanic_id == m.id,
                                       ServiceRequest.status.in_(MECHANIC_ACTIVE_STATUSES)).count()


def _mech_dict(m):
    d = m.to_dict()
    d["active_jobs"] = _active_jobs(m)
    d["completed_jobs"] = ServiceRequest.query.filter_by(mechanic_id=m.id, status="Completed").count()
    return d


@bp.get("/mechanics/available")
@role_required("admin")
def available_mechanics():
    ms = (Mechanic.query.join(User).filter(Mechanic.is_available.is_(True), User.is_active.is_(True))
          .order_by(User.name).all())
    return jsonify({"items": [_mech_dict(m) for m in ms], "total": len(ms)})


@bp.get("/mechanics")
@role_required("admin")
def list_mechanics():
    q = Mechanic.query.join(User)
    if request.args.get("q"):
        t = f"%{request.args['q'].strip()}%"
        q = q.filter(or_(User.name.ilike(t), User.email.ilike(t), Mechanic.specialization.ilike(t)))
    return jsonify(paginate(q.order_by(User.name), _mech_dict))


@bp.post("/mechanics")
@role_required("admin")
def create_mechanic():
    d = json_body()
    u = User(role="mechanic", name=clean_str(d, "name", "Name", max_len=120, min_len=2),
             email=validate_email(d.get("email")), contact=validate_contact(d.get("contact")))
    ensure_unique(u.email, u.contact)
    pw = d.get("password") or temp_password()
    u.set_password(validate_password(pw))
    spec = clean_str(d, "specialization", "Specialization", required=False, max_len=120)
    m = Mechanic(user=u, specialization=spec, is_available=True)
    db.session.add_all([u, m])
    db.session.commit()
    return jsonify({**_mech_dict(m), "temp_password": pw}), 201


@bp.put("/mechanics/<int:mid>")
@role_required("admin")
def update_mechanic(mid):
    m = get_or_404(Mechanic, mid, "Mechanic")
    d = json_body()
    u = m.user
    jobs = _active_jobs(m)
    if "name" in d:
        u.name = clean_str(d, "name", "Name", max_len=120, min_len=2)
    if "contact" in d:
        u.contact = validate_contact(d["contact"])
        ensure_unique(contact=u.contact, exclude_id=u.id)
    if "specialization" in d:
        m.specialization = clean_str(d, "specialization", "Specialization", required=False, max_len=120)
    if "is_active" in d:
        if not d["is_active"] and jobs:
            raise ApiError("Mechanic has active jobs and cannot be deactivated", 409, "mechanic_has_active_jobs")
        u.is_active = bool(d["is_active"])
        if not u.is_active:
            m.is_available = False
    if "is_available" in d:
        if d["is_available"] and jobs:
            raise ApiError("Mechanic has active jobs and cannot be marked available", 409,
                           "mechanic_has_active_jobs")
        if d["is_available"] and not u.is_active:
            raise ApiError("Reactivate the mechanic first", 409, "inactive")
        m.is_available = bool(d["is_available"])
    if "password" in d and d["password"]:
        u.set_password(validate_password(d["password"]))
    if d.get("is_active") is True and "is_available" not in d:
        m.is_available = True
    db.session.commit()
    return jsonify(_mech_dict(m))


@bp.delete("/mechanics/<int:mid>")
@role_required("admin")
def delete_mechanic(mid):
    m = get_or_404(Mechanic, mid, "Mechanic")
    if _active_jobs(m):
        raise ApiError("Mechanic has active jobs and cannot be deleted", 409, "mechanic_has_active_jobs")
    m.user.is_active = False  # soft delete keeps job history intact
    m.is_available = False
    db.session.commit()
    return jsonify({"message": "Mechanic deactivated", "mechanic": _mech_dict(m)})
