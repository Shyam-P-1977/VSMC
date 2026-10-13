import sqlite3
import os
from flask import Flask
from config import Config
from extensions import db
import models

def run_migration():
    print("[*] Starting multi-center safe database migration...")
    db_path = os.path.join(os.path.dirname(__file__), 'vscms.db')
    if not os.path.exists(db_path):
        print("[!] No existing vscms.db file found. Creating fresh schema...")
    else:
        print(f"[*] Found existing database at {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        def add_column_if_missing(table, column, col_type):
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]
            if column not in columns:
                print(f"[+] Adding column {column} ({col_type}) to table {table}")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

        # Check existing tables and add columns safely
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        if 'users' in tables:
            add_column_if_missing('users', 'center_id', 'INTEGER')
            add_column_if_missing('users', 'city', 'TEXT')
            add_column_if_missing('users', 'area', 'TEXT')
            add_column_if_missing('users', 'state', 'TEXT DEFAULT "Maharashtra"')
            add_column_if_missing('users', 'latitude', 'REAL')
            add_column_if_missing('users', 'longitude', 'REAL')

        if 'mechanics' in tables:
            add_column_if_missing('mechanics', 'center_id', 'INTEGER')
            add_column_if_missing('mechanics', 'experience_years', 'INTEGER DEFAULT 4')
            add_column_if_missing('mechanics', 'rating', 'REAL DEFAULT 4.8')
            add_column_if_missing('mechanics', 'photo_url', 'TEXT')

        if 'time_slots' in tables:
            add_column_if_missing('time_slots', 'center_id', 'INTEGER')

        if 'service_requests' in tables:
            add_column_if_missing('service_requests', 'center_id', 'INTEGER')
            add_column_if_missing('service_requests', 'rejection_reason', 'TEXT')
            add_column_if_missing('service_requests', 'accepted_at', 'TIMESTAMP')
            add_column_if_missing('service_requests', 'rejected_at', 'TIMESTAMP')
            add_column_if_missing('service_requests', 'assigned_at', 'TIMESTAMP')

        if 'spare_parts' in tables:
            add_column_if_missing('spare_parts', 'center_id', 'INTEGER')

        if 'invoices' in tables:
            add_column_if_missing('invoices', 'center_id', 'INTEGER')

        conn.commit()
        conn.close()

    # Now run SQLAlchemy db.create_all() inside app context
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        db.create_all()
        print("[*] Verified all tables exist in database.")

        # Check or create Default Service Center (ID = 1)
        default_center = db.session.get(models.Service_Center, 1)
        if not default_center:
            print("[+] Creating Default Service Center (ID = 1)...")
            default_center = models.Service_Center(
                id=1,
                name="VSCMS Central Workshop Pune",
                email="center1@vscms.com",
                phone="+91 98222 00000",
                address="Plot 42, Auto Hub Way, Tech Industrial Park",
                city="Pune",
                area="Hinjawadi",
                state="Maharashtra",
                pincode="411057",
                latitude=18.5933,
                longitude=73.7344,
                working_hours="09:00-18:00",
                working_days="Mon-Sat",
                description="State-of-the-art facility featuring 9 automated vehicle service hydraulic bays.",
                approval_status="Approved",
                is_active=True,
                avg_rating=4.9
            )
            db.session.add(default_center)
            db.session.flush()

        # Update existing records to link to Center 1
        # 1. Admin user -> role 'center', center_id = 1
        admin_user = models.User.query.filter_by(Email="admin@vscms.com").first()
        if admin_user:
            admin_user.Role = "center"
            admin_user.center_id = 1
            default_center.owner_user_id = admin_user.User_ID

        # 2. Existing mechanics -> center_id = 1
        models.Mechanic.query.filter(models.Mechanic.center_id.is_(None)).update({"center_id": 1})
        # 3. Existing slots -> center_id = 1
        models.Time_Slot.query.filter(models.Time_Slot.center_id.is_(None)).update({"center_id": 1})
        # 4. Existing parts -> center_id = 1
        models.Spare_Part.query.filter(models.Spare_Part.center_id.is_(None)).update({"center_id": 1})
        # 5. Existing service_requests -> center_id = 1
        models.Service_Request.query.filter(models.Service_Request.center_id.is_(None)).update({"center_id": 1})
        # 6. Existing invoices -> center_id = 1
        models.Invoice.query.filter(models.Invoice.center_id.is_(None)).update({"center_id": 1})

        # 7. Populate center_services for Center 1
        all_catalog_services = models.Service.query.all()
        for svc in all_catalog_services:
            existing_cs = models.Center_Service.query.filter_by(center_id=1, service_id=svc.Service_ID).first()
            if not existing_cs:
                cs = models.Center_Service(
                    center_id=1,
                    service_id=svc.Service_ID,
                    price=svc.Base_Price,
                    estimated_hours=svc.Estimated_Hours,
                    is_active=True
                )
                db.session.add(cs)

        # 8. Populate invoice_line_items for existing invoices if empty
        invoices = models.Invoice.query.all()
        for inv in invoices:
            if not inv.line_items and inv.request:
                # Add services
                for item in inv.request.service_items:
                    line = models.Invoice_Line_Item(
                        invoice_id=inv.Invoice_ID,
                        item_type="Service",
                        description=item.service.Name if item.service else "Service Package",
                        quantity=1.0,
                        unit_price=item.Unit_Price_At_Time,
                        amount=item.Unit_Price_At_Time
                    )
                    db.session.add(line)
                # Add parts
                for part in inv.request.parts_used:
                    line = models.Invoice_Line_Item(
                        invoice_id=inv.Invoice_ID,
                        item_type="Part",
                        description=f"{part.part.Name if part.part else 'Spare Part'} (x{part.Quantity})",
                        quantity=float(part.Quantity),
                        unit_price=part.Unit_Price_At_Time,
                        amount=round(part.Quantity * part.Unit_Price_At_Time, 2)
                    )
                    db.session.add(line)
                # Add labour
                for labour in inv.request.labour_entries:
                    line = models.Invoice_Line_Item(
                        invoice_id=inv.Invoice_ID,
                        item_type="Labour",
                        description=f"{labour.Description} ({labour.Hours} hrs @ ₹{labour.Rate_Per_Hour}/hr)",
                        quantity=float(labour.Hours),
                        unit_price=labour.Rate_Per_Hour,
                        amount=round(labour.Hours * labour.Rate_Per_Hour, 2)
                    )
                    db.session.add(line)

        db.session.commit()
        print("[OK] Safe database migration completed successfully!")

if __name__ == '__main__':
    run_migration()
