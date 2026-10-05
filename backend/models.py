"""SQLAlchemy models for VSCMS."""
from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db

# ---- constants -------------------------------------------------------------
ROLES = ("customer", "admin", "mechanic")
REQUEST_STATUSES = ("Pending", "Assigned", "In Progress", "Awaiting Parts", "Completed", "Cancelled")
ACTIVE_STATUSES = ("Pending", "Assigned", "In Progress", "Awaiting Parts")
MECHANIC_ACTIVE_STATUSES = ("Assigned", "In Progress", "Awaiting Parts")
PAYMENT_METHODS = ("UPI", "Card", "NetBanking", "Cash")
INVOICE_STATUSES = ("Unpaid", "Paid")
FUEL_TYPES = ("Petrol", "Diesel", "CNG", "Electric", "Hybrid")


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt):
    return dt.isoformat() + "Z" if dt else None


def money(v):
    return round(float(v or 0), 2)


# ---- users -----------------------------------------------------------------
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    contact = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)
    address = db.Column(db.String(300))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    mechanic = db.relationship("Mechanic", back_populates="user", uselist=False)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def to_dict(self):
        d = {
            "id": self.id, "name": self.name, "email": self.email, "contact": self.contact,
            "role": self.role, "address": self.address, "is_active": self.is_active,
            "created_at": iso(self.created_at),
        }
        if self.mechanic:
            d["mechanic_id"] = self.mechanic.id
            d["specialization"] = self.mechanic.specialization
            d["is_available"] = self.mechanic.is_available
        return d


class Mechanic(db.Model):
    __tablename__ = "mechanics"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    specialization = db.Column(db.String(120))
    is_available = db.Column(db.Boolean, nullable=False, default=True, index=True)

    user = db.relationship("User", back_populates="mechanic")

    def to_dict(self):
        return {
            "id": self.id, "user_id": self.user_id, "name": self.user.name, "email": self.user.email,
            "contact": self.user.contact, "specialization": self.specialization,
            "is_available": self.is_available, "is_active": self.user.is_active,
            "created_at": iso(self.user.created_at),
        }


# ---- vehicles / catalog / slots -------------------------------------------
class Vehicle(db.Model):
    __tablename__ = "vehicles"
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    registration_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    make = db.Column(db.String(60), nullable=False)
    model = db.Column(db.String(60), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    fuel_type = db.Column(db.String(20))
    color = db.Column(db.String(30))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    customer = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id, "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "registration_number": self.registration_number, "make": self.make, "model": self.model,
            "year": self.year, "fuel_type": self.fuel_type, "color": self.color,
            "created_at": iso(self.created_at),
        }


class Service(db.Model):
    __tablename__ = "services"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.String(500), nullable=False, default="")
    base_price = db.Column(db.Float, nullable=False)
    estimated_hours = db.Column(db.Float, nullable=False, default=1)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "description": self.description,
            "base_price": money(self.base_price), "estimated_hours": self.estimated_hours,
            "is_active": self.is_active,
        }


class TimeSlot(db.Model):
    __tablename__ = "time_slots"
    __table_args__ = (UniqueConstraint("date", "start_time", name="uq_slot_date_start"),)
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    capacity = db.Column(db.Integer, nullable=False, default=3)
    booked_count = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id, "date": self.date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"), "end_time": self.end_time.strftime("%H:%M"),
            "capacity": self.capacity, "booked_count": self.booked_count,
            "available": max(self.capacity - self.booked_count, 0),
            "is_available": self.booked_count < self.capacity,
        }


# ---- service requests ------------------------------------------------------
class ServiceRequest(db.Model):
    __tablename__ = "service_requests"
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False, index=True)
    slot_id = db.Column(db.Integer, db.ForeignKey("time_slots.id"), nullable=False, index=True)
    problem_description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Pending", index=True)
    mechanic_id = db.Column(db.Integer, db.ForeignKey("mechanics.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    completed_at = db.Column(db.DateTime)

    customer = db.relationship("User", foreign_keys=[customer_id])
    vehicle = db.relationship("Vehicle")
    slot = db.relationship("TimeSlot")
    mechanic = db.relationship("Mechanic")
    items = db.relationship("ServiceRequestItem", cascade="all, delete-orphan")
    history = db.relationship("StatusHistory", cascade="all, delete-orphan",
                              order_by="StatusHistory.timestamp, StatusHistory.id")
    parts_used = db.relationship("JobPartUsed", cascade="all, delete-orphan")
    labour = db.relationship("JobLabour", cascade="all, delete-orphan")
    invoice = db.relationship("Invoice", uselist=False, cascade="all, delete-orphan",
                              back_populates="request")
    attachments = db.relationship("ServiceRequestAttachment", cascade="all, delete-orphan")

    def to_dict(self, detail=False):
        d = {
            "id": self.id, "status": self.status, "problem_description": self.problem_description,
            "customer": {"id": self.customer.id, "name": self.customer.name,
                         "contact": self.customer.contact, "email": self.customer.email},
            "vehicle": self.vehicle.to_dict(), "slot": self.slot.to_dict(),
            "services": [i.service.to_dict() for i in self.items],
            "estimated_total": money(sum(i.service.base_price for i in self.items)),
            "mechanic": ({"id": self.mechanic.id, "name": self.mechanic.user.name,
                          "contact": self.mechanic.user.contact} if self.mechanic else None),
            "created_at": iso(self.created_at), "updated_at": iso(self.updated_at),
            "completed_at": iso(self.completed_at),
            "invoice": ({"id": self.invoice.id, "invoice_number": self.invoice.invoice_number,
                         "total_amount": self.invoice.payable_total, "status": self.invoice.status}
                        if self.invoice else None),
            "attachments": [a.to_dict() for a in self.attachments],
        }
        if detail:
            d["timeline"] = [h.to_dict() for h in self.history]
            d["parts_used"] = [p.to_dict() for p in self.parts_used]
            d["labour"] = [l.to_dict() for l in self.labour]
        return d


class ServiceRequestItem(db.Model):
    __tablename__ = "service_request_items"
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False, index=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False, index=True)
    service = db.relationship("Service")


class ServiceRequestAttachment(db.Model):
    __tablename__ = "service_request_attachments"
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False, index=True)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "created_at": iso(self.created_at)
        }


class StatusHistory(db.Model):
    __tablename__ = "status_history"
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    note = db.Column(db.String(300))
    timestamp = db.Column(db.DateTime, nullable=False, default=utcnow)
    user = db.relationship("User")

    def to_dict(self):
        return {"id": self.id, "status": self.status, "note": self.note,
                "changed_by": self.user.name if self.user else None,
                "changed_by_role": self.user.role if self.user else None,
                "timestamp": iso(self.timestamp)}


# ---- inventory / job details ------------------------------------------------
class SparePart(db.Model):
    __tablename__ = "spare_parts"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity_in_stock = db.Column(db.Integer, nullable=False, default=0)
    min_threshold = db.Column(db.Integer, nullable=False, default=5)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "price": money(self.price),
                "quantity_in_stock": self.quantity_in_stock, "min_threshold": self.min_threshold,
                "is_low_stock": self.quantity_in_stock < self.min_threshold,
                "updated_at": iso(self.updated_at)}


class JobPartUsed(db.Model):
    __tablename__ = "job_parts_used"
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False, index=True)
    part_id = db.Column(db.Integer, db.ForeignKey("spare_parts.id"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price_at_time = db.Column(db.Float, nullable=False)
    part = db.relationship("SparePart")

    def to_dict(self):
        return {"id": self.id, "part_id": self.part_id, "name": self.part.name,
                "quantity": self.quantity, "unit_price": money(self.unit_price_at_time),
                "line_total": money(self.quantity * self.unit_price_at_time)}


class JobLabour(db.Model):
    __tablename__ = "job_labour"
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False, index=True)
    description = db.Column(db.String(300), nullable=False)
    hours = db.Column(db.Float, nullable=False)
    rate_per_hour = db.Column(db.Float, nullable=False)
    repair_notes = db.Column(db.Text)

    def to_dict(self):
        return {"id": self.id, "description": self.description, "hours": self.hours,
                "rate_per_hour": money(self.rate_per_hour), "repair_notes": self.repair_notes,
                "line_total": money(self.hours * self.rate_per_hour)}


# ---- billing ----------------------------------------------------------------
class Invoice(db.Model):
    __tablename__ = "invoices"
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), unique=True, nullable=False)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)
    labour_charge = db.Column(db.Float, nullable=False, default=0)
    parts_cost = db.Column(db.Float, nullable=False, default=0)
    gst_rate = db.Column(db.Float, nullable=False, default=18)
    gst_amount = db.Column(db.Float, nullable=False, default=0)
    discount = db.Column(db.Float, nullable=False, default=0)
    total_amount = db.Column(db.Float, nullable=False, default=0)
    status = db.Column(db.String(10), nullable=False, default="Unpaid", index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    request = db.relationship("ServiceRequest", back_populates="invoice")
    payments = db.relationship("Payment", order_by="Payment.id")
    adjustments = db.relationship("InvoiceAdjustment", cascade="all, delete-orphan",
                                  order_by="InvoiceAdjustment.id")

    @property
    def adjustments_total(self):
        return money(sum(a.amount for a in self.adjustments))

    @property
    def payable_total(self):
        return money(self.total_amount + self.adjustments_total)

    @property
    def paid_payment(self):
        return next((p for p in self.payments if p.status == "Success"), None)

    def to_dict(self, detail=True):
        r = self.request
        d = {
            "id": self.id, "request_id": self.request_id, "invoice_number": self.invoice_number,
            "labour_charge": money(self.labour_charge), "parts_cost": money(self.parts_cost),
            "subtotal": money(self.labour_charge + self.parts_cost),
            "gst_rate": self.gst_rate, "gst_amount": money(self.gst_amount),
            "discount": money(self.discount), "total_amount": money(self.total_amount),
            "adjustments_total": self.adjustments_total, "payable_total": self.payable_total,
            "status": self.status, "created_at": iso(self.created_at),
            "customer": {"id": r.customer.id, "name": r.customer.name, "contact": r.customer.contact,
                         "email": r.customer.email},
            "vehicle": {"registration_number": r.vehicle.registration_number,
                        "make": r.vehicle.make, "model": r.vehicle.model},
        }
        if detail:
            d["labour"] = [l.to_dict() for l in r.labour]
            d["parts"] = [p.to_dict() for p in r.parts_used]
            d["services"] = [i.service.name for i in r.items]
            d["adjustments"] = [a.to_dict() for a in self.adjustments]
            d["payments"] = [p.to_dict() for p in self.payments]
        return d


class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(12))
    transaction_id = db.Column(db.String(40), index=True)
    # Initiated -> Processing -> Success | Failed | Cancelled
    status = db.Column(db.String(12), nullable=False, default="Initiated", index=True)
    failure_reason = db.Column(db.String(200))
    last4 = db.Column(db.String(4))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    invoice = db.relationship("Invoice", viewonly=True)

    def to_dict(self):
        return {"id": self.id, "invoice_id": self.invoice_id, "amount": money(self.amount),
                "method": self.method, "transaction_id": self.transaction_id, "status": self.status,
                "failure_reason": self.failure_reason, "last4": self.last4,
                "created_at": iso(self.created_at)}


class InvoiceAdjustment(db.Model):
    __tablename__ = "invoice_adjustments"
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    reason = db.Column(db.String(300), nullable=False)
    amount = db.Column(db.Float, nullable=False)  # signed: negative = credit/refund
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    author = db.relationship("User")

    def to_dict(self):
        return {"id": self.id, "reason": self.reason, "amount": money(self.amount),
                "created_by": self.author.name if self.author else None, "created_at": iso(self.created_at)}


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    message = db.Column(db.String(500), nullable=False)
    channel = db.Column(db.String(10), nullable=False, default="in_app")
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    def to_dict(self):
        return {"id": self.id, "message": self.message, "channel": self.channel,
                "is_read": self.is_read, "created_at": iso(self.created_at)}


class Setting(db.Model):
    __tablename__ = "settings"
    key = db.Column(db.String(60), primary_key=True)
    value = db.Column(db.String(200), nullable=False)


DEFAULT_SETTINGS = {
    "gst_rate": "18",
    "default_slot_capacity": "3",
    "working_hours": "09:00-18:00",
    "labour_rate": "500",
}


def get_setting(key):
    s = db.session.get(Setting, key)
    return s.value if s else DEFAULT_SETTINGS[key]


def set_setting(key, value):
    s = db.session.get(Setting, key)
    if s:
        s.value = str(value)
    else:
        db.session.add(Setting(key=key, value=str(value)))
