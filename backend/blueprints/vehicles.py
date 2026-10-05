from datetime import date

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import FUEL_TYPES, Vehicle, ServiceRequest
from utils import (ApiError, clean_str, current_user, get_or_404, json_body, paginate, role_required,
                   to_number, validate_reg, validation_error)

bp = Blueprint("vehicles", __name__, url_prefix="/api/vehicles")


def _check_reg_unique(reg, exclude_id=None):
    q = Vehicle.query.filter(Vehicle.registration_number == reg)
    if exclude_id:
        q = q.filter(Vehicle.id != exclude_id)
    if q.first():
        raise ApiError("A vehicle with this registration number is already registered", 409,
                       "duplicate_vehicle", field="registration_number")


def _fill(vehicle, data, partial=False):
    if not partial or "registration_number" in data:
        reg = validate_reg(data.get("registration_number"))
        _check_reg_unique(reg, vehicle.id)
        vehicle.registration_number = reg
    if not partial or "make" in data:
        vehicle.make = clean_str(data, "make", "Make", max_len=60)
    if not partial or "model" in data:
        vehicle.model = clean_str(data, "model", "Model", max_len=60)
    if not partial or "year" in data:
        vehicle.year = to_number(data, "year", "Year", minimum=1980, maximum=date.today().year + 1, integer=True)
    if "fuel_type" in data:
        fuel = clean_str(data, "fuel_type", "Fuel type", required=False, max_len=20)
        if fuel and fuel not in FUEL_TYPES:
            raise validation_error(f"Fuel type must be one of {', '.join(FUEL_TYPES)}", "fuel_type")
        vehicle.fuel_type = fuel
    if "color" in data:
        vehicle.color = clean_str(data, "color", "Color", required=False, max_len=30)


@bp.get("")
@role_required("customer", "admin")
def list_vehicles():
    user = current_user()
    q = Vehicle.query
    if user.role == "customer":
        q = q.filter_by(customer_id=user.id)
    elif request.args.get("customer_id"):
        q = q.filter_by(customer_id=request.args.get("customer_id", type=int))
    return jsonify(paginate(q.order_by(Vehicle.id.desc()), lambda v: v.to_dict()))


@bp.post("")
@role_required("customer")
def create_vehicle():
    data = json_body()
    v = Vehicle(customer_id=current_user().id)
    _fill(v, data)
    db.session.add(v)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("A vehicle with this registration number is already registered", 409, "duplicate_vehicle",
                       field="registration_number")
    return jsonify(v.to_dict()), 201


@bp.put("/<int:vid>")
@role_required("customer")
def update_vehicle(vid):
    v = get_or_404(Vehicle, vid, "Vehicle")
    if v.customer_id != current_user().id:
        raise ApiError("You do not have access to this vehicle", 403, "forbidden")
    _fill(v, json_body(), partial=True)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("A vehicle with this registration number is already registered", 409, "duplicate_vehicle",
                       field="registration_number")
    return jsonify(v.to_dict())


@bp.get("/<int:vid>/history")
@role_required("customer", "admin")
def vehicle_history(vid):
    v = get_or_404(Vehicle, vid, "Vehicle")
    user = current_user()
    if user.role == "customer" and v.customer_id != user.id:
        raise ApiError("You do not have access to this vehicle", 403, "forbidden")
    reqs = (ServiceRequest.query.filter_by(vehicle_id=v.id, status="Completed")
            .order_by(ServiceRequest.completed_at.desc()).all())
    items = []
    for r in reqs:
        d = r.to_dict(detail=True)
        inv = r.invoice
        d["invoice_detail"] = ({**inv.to_dict(detail=False),
                                "paid_payment": inv.paid_payment.to_dict() if inv.paid_payment else None}
                               if inv else None)
        items.append(d)
    return jsonify({"vehicle": v.to_dict(), "items": items, "total": len(items)})
