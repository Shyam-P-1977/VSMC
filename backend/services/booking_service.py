"""Booking + job lifecycle (slots, booking, cancellation, assignment, status flow, completion)."""
from datetime import date, datetime, time, timedelta

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import (ACTIVE_STATUSES, Mechanic, Service, ServiceRequest, ServiceRequestItem,
                    StatusHistory, TimeSlot, User, Vehicle, get_setting, utcnow)
from services import billing_service
from services.notification_service import notify, notify_admins
from utils import ApiError, validation_error

# Mechanic-driven transitions (Completed is handled by complete_job)
MECHANIC_TRANSITIONS = {
    "Assigned": ["In Progress"],
    "In Progress": ["Awaiting Parts", "Completed"],
    "Awaiting Parts": ["In Progress"],
}


# ---- slots -------------------------------------------------------------------
def ensure_slots(d):
    """Generate hourly slots for date d on demand from the working-hours setting."""
    if TimeSlot.query.filter_by(date=d).first():
        return
    start_s, end_s = get_setting("working_hours").split("-")
    start_h, end_h = int(start_s.split(":")[0]), int(end_s.split(":")[0])
    cap = int(get_setting("default_slot_capacity"))
    try:
        for h in range(start_h, end_h):
            db.session.add(TimeSlot(date=d, start_time=time(h, 0), end_time=time(h + 1, 0), capacity=cap))
        db.session.commit()
    except IntegrityError:  # another request generated them concurrently
        db.session.rollback()


def _slot_is_past(slot):
    now = datetime.now()
    return datetime.combine(slot.date, slot.end_time) <= now


def suggest_alternates(slot, limit=3):
    found = []
    for offset in range(0, 8):
        d = slot.date + timedelta(days=offset)
        ensure_slots(d)
        q = TimeSlot.query.filter(TimeSlot.date == d, TimeSlot.booked_count < TimeSlot.capacity,
                                  TimeSlot.id != slot.id).order_by(TimeSlot.start_time)
        for s in q.all():
            if not _slot_is_past(s):
                found.append(s.to_dict())
                if len(found) >= limit:
                    return found
    return found


# ---- helpers -----------------------------------------------------------------
def add_history(req, status, user_id, note=None):
    db.session.add(StatusHistory(request_id=req.id, status=status, changed_by=user_id, note=note))


def label(req):
    return f"#{req.id} ({req.vehicle.registration_number})"


def load_request_for(user, request_id):
    """Fetch a request enforcing role-based visibility (BR-2)."""
    req = db.session.get(ServiceRequest, request_id)
    if not req:
        raise ApiError("Service request not found", 404, "not_found")
    if user.role == "customer" and req.customer_id != user.id:
        raise ApiError("You do not have access to this request", 403, "forbidden")
    if user.role == "mechanic":
        if not user.mechanic or req.mechanic_id != user.mechanic.id:
            raise ApiError("This job is not assigned to you", 403, "forbidden")
    return req


# ---- booking -------------------------------------------------------------------
def book(customer, vehicle_id, service_ids, slot_id, problem, allow_past=False):
    if not isinstance(service_ids, list) or not service_ids:
        raise validation_error("Select at least one service", "service_ids")
    try:
        service_ids = sorted({int(s) for s in service_ids})
    except (TypeError, ValueError):
        raise validation_error("service_ids must be a list of ids", "service_ids")
    if not isinstance(problem, str) or len(problem.strip()) < 5:
        raise validation_error("Describe the problem (at least 5 characters)", "problem_description")
    if len(problem) > 2000:
        raise validation_error("Problem description is too long", "problem_description")

    vehicle = db.session.get(Vehicle, vehicle_id) if isinstance(vehicle_id, int) else None
    if not vehicle or vehicle.customer_id != customer.id:
        raise ApiError("Vehicle not found", 404, "not_found")
    services = Service.query.filter(Service.id.in_(service_ids), Service.is_active.is_(True)).all()
    if len(services) != len(service_ids):
        raise validation_error("One or more selected services are unavailable", "service_ids")
    slot = db.session.get(TimeSlot, slot_id) if isinstance(slot_id, int) else None
    if not slot:
        raise ApiError("Time slot not found", 404, "not_found")
    if not allow_past and _slot_is_past(slot):
        raise ApiError("This time slot is in the past", 422, "slot_in_past")

    # Atomic compare-and-increment: can never overbook even with concurrent requests.
    res = db.session.execute(
        update(TimeSlot).where(TimeSlot.id == slot.id, TimeSlot.booked_count < TimeSlot.capacity)
        .values(booked_count=TimeSlot.booked_count + 1))
    if res.rowcount == 0:
        db.session.rollback()
        alts = suggest_alternates(slot)
        raise ApiError("This slot is fully booked. Please choose another slot.", 409,
                       "slot_unavailable", alternates=alts)

    req = ServiceRequest(customer_id=customer.id, vehicle_id=vehicle.id, slot_id=slot.id,
                         problem_description=problem.strip(), status="Pending")
    req.items = [ServiceRequestItem(service_id=s.id) for s in services]
    db.session.add(req)
    db.session.flush()
    add_history(req, "Pending", customer.id, "Booking created")
    when = f"{slot.date.isoformat()} {slot.start_time.strftime('%H:%M')}"
    notify(customer.id, f"Booking confirmed: request #{req.id} for {vehicle.registration_number} on {when}.",
           sms=True, email=True)
    notify_admins(f"New service request {label(req)} awaiting assignment.")
    db.session.commit()
    return req


def _free_slot(req):
    db.session.execute(update(TimeSlot).where(TimeSlot.id == req.slot_id, TimeSlot.booked_count > 0)
                       .values(booked_count=TimeSlot.booked_count - 1))


def _free_mechanic(req):
    if req.mechanic_id:
        db.session.execute(update(Mechanic).where(Mechanic.id == req.mechanic_id).values(is_available=True))


def cancel(req, user):
    if req.status not in ("Pending", "Assigned"):
        raise ApiError(f"A request that is '{req.status}' can no longer be cancelled", 409, "cannot_cancel")
    mech = req.mechanic
    _free_slot(req)
    _free_mechanic(req)
    req.status = "Cancelled"
    add_history(req, "Cancelled", user.id, f"Cancelled by {user.role}")
    if mech:
        notify(mech.user_id, f"Job {label(req)} was cancelled.")
    if user.role == "customer":
        notify_admins(f"Customer cancelled request {label(req)}.")
    else:
        notify(req.customer_id, f"Your request {label(req)} was cancelled by the service center.", sms=True)
    db.session.commit()
    return req


# ---- assignment ----------------------------------------------------------------
def assign(req, mechanic_id, admin):
    if req.status not in ("Pending", "Assigned"):
        raise ApiError(f"Cannot assign a mechanic to a '{req.status}' request", 409, "illegal_state")
    mech = db.session.get(Mechanic, mechanic_id) if isinstance(mechanic_id, int) else None
    if not mech or not mech.user.is_active:
        raise ApiError("Mechanic not found", 404, "not_found")
    if mech.id == req.mechanic_id:
        raise ApiError("This mechanic is already assigned to the request", 409, "already_assigned")
    res = db.session.execute(update(Mechanic).where(Mechanic.id == mech.id, Mechanic.is_available.is_(True))
                             .values(is_available=False))
    if res.rowcount == 0:
        db.session.rollback()
        raise ApiError("Mechanic is not available", 409, "mechanic_unavailable")
    previous = req.mechanic
    if previous:
        _free_mechanic(req)
        notify(previous.user_id, f"Job {label(req)} was reassigned to another mechanic.")
    req.mechanic_id = mech.id
    req.status = "Assigned"
    add_history(req, "Assigned", admin.id, f"Assigned to {mech.user.name}")
    notify(mech.user_id, f"New job assigned: {label(req)} - {req.problem_description[:80]}", sms=True)
    notify(req.customer_id, f"Mechanic {mech.user.name} has been assigned to your request {label(req)}.",
           sms=True, email=True)
    db.session.commit()
    return req


# ---- mechanic flow ----------------------------------------------------------------
def change_status(req, new_status, user, note=None, no_parts_confirmed=False):
    if new_status == "Completed":
        return complete_job(req, user, no_parts_confirmed)
    allowed = MECHANIC_TRANSITIONS.get(req.status, [])
    if new_status not in allowed:
        raise ApiError(f"Illegal status change: '{req.status}' -> '{new_status}'", 409, "illegal_transition",
                       allowed=allowed)
    req.status = new_status
    add_history(req, new_status, user.id, note or f"Status changed to {new_status}")
    notify(req.customer_id, f"Your request {label(req)} is now '{new_status}'.", sms=True)
    db.session.commit()
    return req


def complete_job(req, user, no_parts_confirmed=False):
    if req.status != "In Progress":
        raise ApiError(f"Illegal status change: '{req.status}' -> 'Completed'", 409, "illegal_transition",
                       allowed=MECHANIC_TRANSITIONS.get(req.status, []))
    missing = []
    if not req.labour:
        missing.append("labour")
    if not req.parts_used and not no_parts_confirmed:
        missing.append("parts")
    if missing:
        msg = ("Missing details: record at least one labour entry" if "labour" in missing else
               "Missing details: record parts used, or confirm that no parts were used")
        raise ApiError(msg, 422, "missing_details", missing=missing)

    req.status = "Completed"
    req.completed_at = utcnow()
    _free_mechanic(req)
    add_history(req, "Completed", user.id, "Job completed by mechanic")
    db.session.flush()
    invoice = billing_service.generate_invoice(req)
    notify(req.customer_id, f"Your request {label(req)} is completed.", sms=True)
    notify(req.customer_id, f"Invoice generated: {invoice.invoice_number} for Rs. {invoice.payable_total:.2f}.",
           sms=True, email=True)
    notify_admins(f"Job {label(req)} completed. Invoice {invoice.invoice_number} generated.")
    db.session.commit()
    return req


def delete_request(req):
    """Admin hard delete. Blocked once the invoice has been paid (BR-14)."""
    if req.invoice and (req.invoice.status == "Paid" or req.invoice.paid_payment):
        raise ApiError("Requests with a paid invoice cannot be deleted", 409, "paid_invoice_locked")
    for p in req.parts_used:  # restore stock
        p.part.quantity_in_stock += p.quantity
    if req.status in ACTIVE_STATUSES:
        _free_slot(req)
        _free_mechanic(req)
    for pay in (req.invoice.payments if req.invoice else []):
        db.session.delete(pay)
    db.session.delete(req)
    db.session.commit()
