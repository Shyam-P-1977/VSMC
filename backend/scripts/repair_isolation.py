"""
Database Isolation Repair Script for VSCMS
Fixes and ensures tenant consistency across all tables idempotently.
Never deletes rows.
"""
import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from extensions import db
from models import (
    User, Service_Center, Service_Request, Invoice, Payment,
    Time_Slot, Spare_Part, Mechanic, Center_Service, Request_Attachment
)

def repair_database():
    print("=" * 80)
    print("RUNNING DATABASE ISOLATION REPAIR")
    print("=" * 80)
    repaired_count = 0

    # 1. Derive invoices.center_id from request if null
    invoices = Invoice.query.all()
    for inv in invoices:
        if inv.Request_ID:
            req = db.session.get(Service_Request, inv.Request_ID)
            if req and req.center_id:
                if inv.center_id != req.center_id:
                    print(f"[*] Updating Invoice #{inv.Invoice_ID} center_id from {inv.center_id} to Request #{req.Request_ID} center_id {req.center_id}")
                    inv.center_id = req.center_id
                    repaired_count += 1

    # 2. Derive user.center_id for center owners who own a center but have center_id NULL
    center_owners = User.query.filter(User.Role.in_(['center', 'admin']), User.center_id.is_(None)).all()
    for u in center_owners:
        owned = Service_Center.query.filter_by(owner_user_id=u.User_ID).first()
        if owned:
            print(f"[*] Setting User #{u.User_ID} ({u.Email}) center_id to owned center #{owned.id}")
            u.center_id = owned.id
            repaired_count += 1

    # 3. Derive user.center_id for mechanics whose mechanic profile has center_id
    mechanic_users = User.query.filter_by(Role='mechanic').all()
    for u in mechanic_users:
        if u.mechanic_profile and u.mechanic_profile.center_id:
            if u.center_id != u.mechanic_profile.center_id:
                print(f"[*] Setting Mechanic User #{u.User_ID} center_id to {u.mechanic_profile.center_id}")
                u.center_id = u.mechanic_profile.center_id
                repaired_count += 1
        elif u.center_id and u.mechanic_profile and not u.mechanic_profile.center_id:
            print(f"[*] Setting Mechanic Profile for User #{u.User_ID} center_id to {u.center_id}")
            u.mechanic_profile.center_id = u.center_id
            repaired_count += 1

    # 4. Derive request center_id from slot if null
    requests = Service_Request.query.filter(Service_Request.center_id.is_(None)).all()
    for r in requests:
        if r.Slot_ID:
            slot = db.session.get(Time_Slot, r.Slot_ID)
            if slot and slot.center_id:
                print(f"[*] Setting Request #{r.Request_ID} center_id to slot center_id {slot.center_id}")
                r.center_id = slot.center_id
                repaired_count += 1

    db.session.commit()
    print(f"\nRepair completed. Total records repaired/updated: {repaired_count}")
    print("=" * 80)

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        repair_database()
