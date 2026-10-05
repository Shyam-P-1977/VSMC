from flask import Blueprint, jsonify, request

from extensions import db
from models import Service, TimeSlot, get_setting
from services.booking_service import ensure_slots
from utils import (ApiError, clean_str, get_or_404, json_body, parse_date, role_required, to_number,
                   validation_error)

catalog_bp = Blueprint("catalog", __name__, url_prefix="/api/services")
slots_bp = Blueprint("slots", __name__, url_prefix="/api/slots")


def _fill_service(s, data, partial=False):
    if not partial or "name" in data:
        name = clean_str(data, "name", "Name", max_len=120, min_len=2)
        dup = Service.query.filter(Service.name.ilike(name))
        if s.id:
            dup = dup.filter(Service.id != s.id)
        if dup.first():
            raise ApiError("A service with this name already exists", 409, "duplicate")
        s.name = name
    if not partial or "description" in data:
        s.description = clean_str(data, "description", "Description", required=False, max_len=500) or ""
    if not partial or "base_price" in data:
        s.base_price = to_number(data, "base_price", "Base price", minimum=0, maximum=10000000)
    if not partial or "estimated_hours" in data:
        s.estimated_hours = to_number(data, "estimated_hours", "Estimated hours", minimum=0.1, maximum=200)
    if "is_active" in data:
        s.is_active = bool(data["is_active"])


@catalog_bp.get("")
@role_required()
def list_services():
    q = Service.query
    from utils import current_user
    if not (current_user().role == "admin" and request.args.get("all") == "1"):
        q = q.filter_by(is_active=True)
    items = [s.to_dict() for s in q.order_by(Service.id).all()]
    return jsonify({"items": items, "total": len(items)})


@catalog_bp.post("")
@role_required("admin")
def create_service():
    s = Service()
    _fill_service(s, json_body())
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@catalog_bp.put("/<int:sid>")
@role_required("admin")
def update_service(sid):
    s = get_or_404(Service, sid, "Service")
    _fill_service(s, json_body(), partial=True)
    db.session.commit()
    return jsonify(s.to_dict())


@catalog_bp.delete("/<int:sid>")
@role_required("admin")
def delete_service(sid):
    s = get_or_404(Service, sid, "Service")
    s.is_active = False  # soft delete
    db.session.commit()
    return jsonify({"message": "Service deactivated", "service": s.to_dict()})


# ---- slots ---------------------------------------------------------------------
@slots_bp.get("")
@role_required()
def list_slots():
    d = parse_date(request.args.get("date"))
    ensure_slots(d)
    slots = TimeSlot.query.filter_by(date=d).order_by(TimeSlot.start_time).all()
    return jsonify({"items": [s.to_dict() for s in slots], "date": d.isoformat(), "total": len(slots)})


@slots_bp.put("/bulk")
@role_required("admin")
def bulk_capacity():
    data = json_body()
    d = parse_date(data.get("date"))
    cap = to_number(data, "capacity", "Capacity", minimum=1, maximum=100, integer=True)
    ensure_slots(d)
    slots = TimeSlot.query.filter_by(date=d).all()
    blocked = [s for s in slots if s.booked_count > cap]
    if blocked:
        raise ApiError("Capacity cannot be lower than existing bookings in a slot", 409, "capacity_conflict")
    for s in slots:
        s.capacity = cap
    db.session.commit()
    return jsonify({"items": [s.to_dict() for s in sorted(slots, key=lambda x: x.start_time)]})


@slots_bp.put("/<int:slot_id>")
@role_required("admin")
def update_slot(slot_id):
    s = get_or_404(TimeSlot, slot_id, "Slot")
    cap = to_number(json_body(), "capacity", "Capacity", minimum=1, maximum=100, integer=True)
    if cap < s.booked_count:
        raise ApiError(f"Capacity cannot be lower than the {s.booked_count} existing bookings", 409,
                       "capacity_conflict")
    s.capacity = cap
    db.session.commit()
    return jsonify(s.to_dict())
