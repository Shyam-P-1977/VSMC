"""Seed demo data:  python seed.py   (resets the database!)"""
import sys
from datetime import date, timedelta

from factory import create_app
from extensions import db
from models import (Mechanic, Service, SparePart, TimeSlot, User, Vehicle, DEFAULT_SETTINGS, Setting)
from services import billing_service, booking_service, inventory_service
from services.notification_service import notify_admins

SERVICES = [
    ("General Service", "Complete multi-point inspection, fluid top-ups, filter checks and general tune-up.", 2499, 3),
    ("Oil Change", "Engine oil and oil filter replacement with fresh grade-approved oil.", 1299, 1),
    ("Brake Repair", "Brake pad / disc inspection, replacement, brake fluid check and test drive.", 1999, 2),
    ("Engine Check-up", "Computerised diagnostics, compression test and engine health report.", 1499, 2),
    ("Battery Replacement", "Battery health test, removal and fitting of a new battery (battery cost extra).", 499, 1),
    ("Wheel Alignment & Balancing", "4-wheel computerised alignment and balancing for even tyre wear.", 1199, 1.5),
    ("AC Service", "AC gas top-up, cabin filter cleaning, vent and compressor check.", 1799, 2),
    ("Car Wash & Cleaning", "Exterior foam wash, interior vacuuming, dashboard and tyre polish.", 599, 1),
    ("Emergency Breakdown Assistance", "On-road breakdown help with a mechanic dispatched to your location.", 1499, 1),
    ("Emergency Fuel Delivery", "Up to 5 litres of fuel delivered to you when you run dry (fuel at actuals).", 399, 0.5),
    ("Pick-up & Drop Service", "Doorstep vehicle pick-up and drop-off for your service appointment.", 349, 1),
]

PARTS = [  # name, price, stock, min_threshold
    ("Engine Oil 5W-30 (1L)", 650, 40, 10), ("Oil Filter", 280, 25, 8), ("Air Filter", 350, 18, 5),
    ("Brake Pads (Front Set)", 1800, 3, 5), ("Brake Disc Rotor", 2400, 8, 4), ("Spark Plug", 220, 30, 8),
    ("Car Battery 12V", 5200, 2, 4), ("Wiper Blade Set", 450, 12, 4), ("Coolant (1L)", 320, 20, 6),
    ("AC Compressor Oil", 540, 9, 3), ("AC Gas R134a", 850, 10, 4), ("Headlight Bulb H4", 380, 14, 5),
    ("Clutch Plate", 3200, 6, 3), ("Timing Belt", 1900, 7, 3), ("Tyre Valve Kit", 90, 50, 10),
]


def mk_user(name, email, contact, role, pw, address=None):
    u = User(name=name, email=email, contact=contact, role=role, address=address)
    u.set_password(pw)
    db.session.add(u)
    return u


def slot(offset, idx):
    d = date.today() + timedelta(days=offset)
    booking_service.ensure_slots(d)
    return TimeSlot.query.filter_by(date=d).order_by(TimeSlot.start_time).all()[idx]


def run():
    db.drop_all()
    db.create_all()
    for k, v in DEFAULT_SETTINGS.items():
        db.session.add(Setting(key=k, value=v))

    admin = mk_user("Service Center Admin", "admin@vscms.com", "9000000000", "admin", "Admin@123",
                    "VSCMS Auto Care, MG Road, Pune")
    mechs = []
    for i, (n, spec) in enumerate([("Ravi Kumar", "Engine & Transmission"), ("Suresh Patil", "Brakes & Suspension"),
                                   ("Imran Shaikh", "AC & Electricals")], start=1):
        u = mk_user(n, f"mech{i}@vscms.com", f"900000010{i}", "mechanic", "Mech@123")
        m = Mechanic(user=u, specialization=spec, is_available=True)
        db.session.add(m)
        mechs.append(m)
    custs = [mk_user(n, f"cust{i}@vscms.com", f"900000020{i}", "customer", "Cust@123", a) for i, (n, a) in enumerate([
        ("Aarav Sharma", "12 Lake View Apartments, Pune"), ("Priya Nair", "45 Green Park, Mumbai"),
        ("Rahul Verma", "78 Residency Road, Bengaluru")], start=1)]
    db.session.flush()

    vehicles = {
        "swift": Vehicle(customer_id=custs[0].id, registration_number="MH12AB1234", make="Maruti Suzuki",
                         model="Swift", year=2019, fuel_type="Petrol", color="White"),
        "nexon": Vehicle(customer_id=custs[0].id, registration_number="MH12XY4321", make="Tata", model="Nexon",
                         year=2021, fuel_type="Diesel", color="Blue"),
        "city": Vehicle(customer_id=custs[1].id, registration_number="MH14CD5678", make="Honda", model="City",
                        year=2018, fuel_type="Petrol", color="Silver"),
        "creta": Vehicle(customer_id=custs[2].id, registration_number="KA01EF9012", make="Hyundai", model="Creta",
                         year=2020, fuel_type="Diesel", color="Black"),
    }
    db.session.add_all(vehicles.values())
    svc = {}
    for name, desc, price, hrs in SERVICES:
        s = Service(name=name, description=desc, base_price=price, estimated_hours=hrs)
        db.session.add(s)
        svc[name] = s
    parts = {}
    for name, price, stock, thr in PARTS:
        p = SparePart(name=name, price=price, quantity_in_stock=stock, min_threshold=thr)
        db.session.add(p)
        parts[name] = p
    db.session.commit()

    for off in range(-7, 15):  # slots for the past week + next 14 days
        booking_service.ensure_slots(date.today() + timedelta(days=off))

    def book(cust, v, names, off, idx, problem):
        return booking_service.book(cust, vehicles[v].id, [svc[n].id for n in names], slot(off, idx).id,
                                    problem, allow_past=True)

    def run_job(req, mech, labour, used):
        booking_service.assign(req, mech.id, admin)
        mech_user = mech.user
        booking_service.change_status(req, "In Progress", mech_user)
        inventory_service.add_labour(req, labour)
        for pname, qty in used:
            inventory_service.add_part(req, parts[pname].id, qty, mech_user)
        booking_service.complete_job(req, mech_user, no_parts_confirmed=not used)
        return req

    # 1) Completed + Paid
    r1 = book(custs[0], "swift", ["General Service", "Oil Change"], -5, 1, "Routine 10,000 km service due.")
    run_job(r1, mechs[0], {"description": "General service and oil change", "hours": 2, "rate_per_hour": 500,
                           "repair_notes": "All fluids topped up. Brakes in good condition."},
            [("Engine Oil 5W-30 (1L)", 3), ("Oil Filter", 1)])
    billing_service.record_payment_success(r1.invoice, "UPI", "TXN0000000001", None, actor_id=custs[0].id)
    db.session.commit()

    # 2) Completed + Unpaid
    r2 = book(custs[1], "city", ["Brake Repair"], -2, 3, "Grinding noise when braking.")
    run_job(r2, mechs[0], {"description": "Front brake pad replacement", "hours": 1.5, "rate_per_hour": 500,
                           "repair_notes": "Pads worn below limit; discs resurfaced."},
            [("Brake Pads (Front Set)", 1)])

    # 3) In Progress (mechanic 2)
    r3 = book(custs[2], "creta", ["Engine Check-up"], 0, 2, "Check engine light is on and mileage dropped.")
    booking_service.assign(r3, mechs[1].id, admin)
    booking_service.change_status(r3, "In Progress", mechs[1].user)

    # 4) Assigned (mechanic 3)
    r4 = book(custs[0], "nexon", ["AC Service"], 1, 2, "AC not cooling properly.")
    booking_service.assign(r4, mechs[2].id, admin)

    # 5, 6) Pending
    book(custs[1], "city", ["Wheel Alignment & Balancing"], 1, 4, "Steering pulls to the left.")
    book(custs[2], "creta", ["Battery Replacement", "Pick-up & Drop Service"], 2, 0,
         "Car struggles to start in the morning.")

    # 7) Cancelled
    r7 = book(custs[0], "swift", ["Car Wash & Cleaning"], 3, 5, "Full interior and exterior cleaning.")
    booking_service.cancel(r7, custs[0])

    for p in parts.values():
        db.session.refresh(p)
        if p.quantity_in_stock < p.min_threshold:
            notify_admins(f"Low stock alert: {p.name} has {p.quantity_in_stock} left (minimum {p.min_threshold}).")
    db.session.commit()


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        run()
    print("Database seeded.\n  admin@vscms.com / Admin@123\n  mech1@vscms.com / Mech@123 (mech1..mech3)\n"
          "  cust1@vscms.com / Cust@123 (cust1..cust3)")
