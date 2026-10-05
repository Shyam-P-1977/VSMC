"""Inventory + job parts/labour logic with transactional stock handling."""
from sqlalchemy import update

from extensions import db
from models import JobLabour, JobPartUsed, SparePart, get_setting
from services.notification_service import notify, notify_admins
from utils import ApiError, clean_str, to_number, validation_error


def _ensure_editable(req):
    if req.status not in ("In Progress", "Awaiting Parts"):
        raise ApiError("Parts and labour can only be recorded while the job is In Progress or Awaiting Parts",
                       409, "illegal_state")


def _low_stock_check(part):
    if part.quantity_in_stock < part.min_threshold:
        notify_admins(f"Low stock alert: {part.name} has {part.quantity_in_stock} left "
                      f"(minimum {part.min_threshold}).")


def _deduct(req, part, qty, user):
    """Atomically deduct stock. On shortage: job -> Awaiting Parts, admin notified, error raised."""
    from services.booking_service import add_history, label
    res = db.session.execute(update(SparePart).where(SparePart.id == part.id, SparePart.quantity_in_stock >= qty)
                             .values(quantity_in_stock=SparePart.quantity_in_stock - qty))
    if res.rowcount == 0:
        db.session.rollback()
        part = db.session.get(SparePart, part.id)
        req = db.session.get(type(req), req.id)
        if req.status == "In Progress":
            req.status = "Awaiting Parts"
            add_history(req, "Awaiting Parts", user.id, f"Insufficient stock for {part.name}")
            notify(req.customer_id, f"Your request {label(req)} is waiting for spare parts.", sms=True)
        notify_admins(f"Insufficient stock: {part.name} needed {qty}, only {part.quantity_in_stock} available "
                      f"for job {label(req)}.")
        available, status = part.quantity_in_stock, req.status
        db.session.commit()
        raise ApiError("Insufficient stock", 409, "insufficient_stock", available=available,
                       requested=qty, job_status=status)


def add_part(req, part_id, quantity, user):
    _ensure_editable(req)
    part = db.session.get(SparePart, part_id) if isinstance(part_id, int) else None
    if not part:
        raise ApiError("Spare part not found", 404, "not_found")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 1:
        raise validation_error("Quantity must be a whole number of at least 1", "quantity")
    _deduct(req, part, quantity, user)
    jpu = JobPartUsed(request_id=req.id, part_id=part.id, quantity=quantity, unit_price_at_time=part.price)
    db.session.add(jpu)
    db.session.flush()
    db.session.refresh(part)
    _low_stock_check(part)
    db.session.commit()
    return jpu


def update_part(req, jpu, quantity, user):
    _ensure_editable(req)
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 1:
        raise validation_error("Quantity must be a whole number of at least 1", "quantity")
    delta = quantity - jpu.quantity
    part = jpu.part
    if delta > 0:
        _deduct(req, part, delta, user)
        jpu = db.session.get(JobPartUsed, jpu.id)
    elif delta < 0:
        part.quantity_in_stock += -delta
    jpu.quantity = quantity
    db.session.flush()
    db.session.refresh(part)
    if delta > 0:
        _low_stock_check(part)
    db.session.commit()
    return jpu


def remove_part(req, jpu):
    _ensure_editable(req)
    jpu.part.quantity_in_stock += jpu.quantity   # restore stock
    db.session.delete(jpu)
    db.session.commit()


def add_labour(req, data):
    _ensure_editable(req)
    desc = clean_str(data, "description", "Description", max_len=300)
    hours = to_number(data, "hours", "Hours", minimum=0.1, maximum=100)
    rate = to_number(data, "rate_per_hour", "Rate per hour", minimum=0, maximum=100000, required=False,
                     default=float(get_setting("labour_rate")))
    notes = clean_str(data, "repair_notes", "Repair notes", required=False, max_len=2000)
    entry = JobLabour(request_id=req.id, description=desc, hours=hours, rate_per_hour=rate, repair_notes=notes)
    db.session.add(entry)
    db.session.commit()
    return entry


def remove_labour(req, entry):
    _ensure_editable(req)
    db.session.delete(entry)
    db.session.commit()


# ---- admin inventory CRUD ------------------------------------------------------
def save_part(part, data, partial=False):
    if not partial or "name" in data:
        name = clean_str(data, "name", "Name", max_len=120)
        dup = SparePart.query.filter(SparePart.name.ilike(name))
        if part.id:
            dup = dup.filter(SparePart.id != part.id)
        if dup.first():
            raise ApiError("A spare part with this name already exists", 409, "duplicate")
        part.name = name
    if not partial or "price" in data:
        part.price = to_number(data, "price", "Price", minimum=0, maximum=10000000)
    if not partial or "quantity_in_stock" in data:
        part.quantity_in_stock = to_number(data, "quantity_in_stock", "Stock quantity", minimum=0,
                                           integer=True, maximum=1000000)
    if "min_threshold" in data or not part.id:
        part.min_threshold = to_number(data, "min_threshold", "Minimum threshold", minimum=0, integer=True,
                                       required=False, default=5)
    return part
