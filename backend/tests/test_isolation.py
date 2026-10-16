import pytest
import io
import json
from datetime import date, datetime, timedelta
from extensions import db, hash_password, generate_jwt
from models import (
    User, Service_Center, Mechanic, Service, Center_Service,
    Time_Slot, Spare_Part, Vehicle, Service_Request, Job_Labour,
    Job_Part_Used, Invoice, Payment, Request_Attachment, Notification
)

@pytest.fixture
def isolation_data(app):
    with app.app_context():
        # 1. Platform Admin
        platform_admin = User(
            Name="Platform Superadmin",
            Email="platform@vscms.com",
            Contact="9999900000",
            Password_Hash=hash_password("Platform@123"),
            Role="platform_admin",
            Is_Active=True
        )
        db.session.add(platform_admin)

        # 2. Service Centers
        center_a = Service_Center(
            name="Center Alpha Auto",
            center_code="VSC-PUN-0001",
            email="centera@vscms.com",
            phone="9822100001",
            address="Kothrud, Pune",
            city="Pune",
            area="Kothrud",
            state="Maharashtra",
            pincode="411038",
            latitude=18.5074,
            longitude=73.8077,
            approval_status="Approved",
            is_active=True
        )
        center_b = Service_Center(
            name="Center Beta Motors",
            center_code="VSC-PUN-0002",
            email="centerb@vscms.com",
            phone="9822100002",
            address="Baner, Pune",
            city="Pune",
            area="Baner",
            state="Maharashtra",
            pincode="411045",
            latitude=18.5590,
            longitude=73.7868,
            approval_status="Approved",
            is_active=True
        )
        db.session.add_all([center_a, center_b])
        db.session.flush()

        # 3. Center Owners
        owner_a = User(
            Name="Owner Alpha",
            Email="owner_a@centera.com",
            Contact="9822000001",
            Password_Hash=hash_password("OwnerA@123"),
            Role="center",
            center_id=center_a.id,
            Is_Active=True
        )
        owner_b = User(
            Name="Owner Beta",
            Email="owner_b@centerb.com",
            Contact="9822000002",
            Password_Hash=hash_password("OwnerB@123"),
            Role="center",
            center_id=center_b.id,
            Is_Active=True
        )
        db.session.add_all([owner_a, owner_b])
        db.session.flush()
        center_a.owner_user_id = owner_a.User_ID
        center_b.owner_user_id = owner_b.User_ID

        # 4. Mechanics
        mech_user_a = User(
            Name="Mechanic Alpha",
            Email="mech_a@centera.com",
            Contact="9822200001",
            Password_Hash=hash_password("MechA@123"),
            Role="mechanic",
            center_id=center_a.id,
            Is_Active=True
        )
        mech_user_b = User(
            Name="Mechanic Beta",
            Email="mech_b@centerb.com",
            Contact="9822200002",
            Password_Hash=hash_password("MechB@123"),
            Role="mechanic",
            center_id=center_b.id,
            Is_Active=True
        )
        db.session.add_all([mech_user_a, mech_user_b])
        db.session.flush()

        mech_a = Mechanic(
            User_ID=mech_user_a.User_ID,
            center_id=center_a.id,
            Specialization="Engine Specialist",
            Is_Available=True
        )
        mech_b = Mechanic(
            User_ID=mech_user_b.User_ID,
            center_id=center_b.id,
            Specialization="Brake Specialist",
            Is_Available=True
        )
        db.session.add_all([mech_a, mech_b])

        # 5. Catalog Service & Center Services
        svc = Service(Name="Full Periodic Maintenance", Description="Comprehensive service", Base_Price=2500.0, Estimated_Hours=2.0)
        db.session.add(svc)
        db.session.flush()

        cs_a = Center_Service(center_id=center_a.id, service_id=svc.Service_ID, price=2500.0, estimated_hours=2.0, is_active=True)
        cs_b = Center_Service(center_id=center_b.id, service_id=svc.Service_ID, price=2800.0, estimated_hours=2.0, is_active=True)
        db.session.add_all([cs_a, cs_b])

        # 6. Slots
        today = date.today().isoformat()
        slot_a = Time_Slot(center_id=center_a.id, Date=today, Start_Time="10:00", End_Time="11:30", Capacity=4, Booked_Count=1)
        slot_b = Time_Slot(center_id=center_b.id, Date=today, Start_Time="10:00", End_Time="11:30", Capacity=4, Booked_Count=1)
        db.session.add_all([slot_a, slot_b])

        # 7. Spare Parts
        part_a = Spare_Part(
            center_id=center_a.id,
            sku="PART-A-OIL",
            Name="Alpha Synthetic Oil 5W30",
            category="Fluids",
            Price=1200.0,
            Quantity_In_Stock=15,
            Min_Threshold=5,
            is_active=True
        )
        part_b = Spare_Part(
            center_id=center_b.id,
            sku="PART-B-PAD",
            Name="Beta Ceramic Brake Pads",
            category="Brakes",
            Price=1800.0,
            Quantity_In_Stock=8,
            Min_Threshold=3,
            is_active=True
        )
        db.session.add_all([part_a, part_b])

        # 8. Customers & Vehicles
        cust1 = User(
            Name="Customer One",
            Email="customer1@test.com",
            Contact="9811000001",
            Password_Hash=hash_password("Cust1@123"),
            Role="customer",
            Is_Active=True
        )
        cust2 = User(
            Name="Customer Two",
            Email="customer2@test.com",
            Contact="9811000002",
            Password_Hash=hash_password("Cust2@123"),
            Role="customer",
            Is_Active=True
        )
        db.session.add_all([cust1, cust2])
        db.session.flush()

        veh1 = Vehicle(Customer_ID=cust1.User_ID, Registration_Number="MH 12 AB 1111", Make="Hyundai", Model="i20", Year=2021, Fuel_Type="Petrol", Color="White")
        veh2 = Vehicle(Customer_ID=cust2.User_ID, Registration_Number="MH 12 CD 2222", Make="Honda", Model="City", Year=2022, Fuel_Type="Petrol", Color="White")
        db.session.add_all([veh1, veh2])
        db.session.flush()

        # 9. Center A Booking: Completed & Paid
        req_a = Service_Request(
            Customer_ID=cust1.User_ID,
            Vehicle_ID=veh1.Vehicle_ID,
            center_id=center_a.id,
            Slot_ID=slot_a.Slot_ID,
            Mechanic_ID=mech_a.Mechanic_ID,
            Status="Completed",
            Urgency="Normal",
            Problem_Description="Regular servicing and oil change"
        )
        db.session.add(req_a)
        db.session.flush()

        labour_a = Job_Labour(Request_ID=req_a.Request_ID, Description="Periodic Maintenance Labour", Hours=2.0, Rate_Per_Hour=500.0)
        used_a = Job_Part_Used(Request_ID=req_a.Request_ID, Part_ID=part_a.Part_ID, Quantity=1, Unit_Price_At_Time=1200.0)
        att_a = Request_Attachment(Request_ID=req_a.Request_ID, Filename="engine_bay.jpg", Stored_Path="engine_bay.jpg", Mime_Type="image/jpeg", Size_Bytes=1024)
        db.session.add_all([labour_a, used_a, att_a])

        # Invoice for Center A
        inv_a = Invoice(
            Request_ID=req_a.Request_ID,
            center_id=center_a.id,
            Invoice_Number="INV-A-0001",
            Labour_Charge=1000.0,
            Parts_Cost=1200.0,
            GST_Amount=396.0,
            Discount=0.0,
            Total_Amount=2596.0,
            Status="Paid"
        )
        db.session.add(inv_a)
        db.session.flush()

        # Payment & Receipt for Center A
        pay_a = Payment(
            Invoice_ID=inv_a.Invoice_ID,
            Amount=2596.0,
            Method="UPI",
            Transaction_ID="TXN-A-9999",
            Status="Success"
        )
        db.session.add(pay_a)

        # Center A Notification
        notif_a = Notification(User_ID=owner_a.User_ID, Message="Center A Invoice #INV-A-0001 Paid")
        db.session.add(notif_a)

        # 10. Center B Booking: Pending
        req_b = Service_Request(
            Customer_ID=cust2.User_ID,
            Vehicle_ID=veh2.Vehicle_ID,
            center_id=center_b.id,
            Slot_ID=slot_b.Slot_ID,
            Status="Pending",
            Urgency="Urgent",
            Problem_Description="Brake vibration at high speeds"
        )
        db.session.add(req_b)

        # Center B Notification
        notif_b = Notification(User_ID=owner_b.User_ID, Message="New urgent booking at Center B")
        db.session.add(notif_b)

        # 11. User with role center but NULL center_id (for security test)
        orphan_center_user = User(
            Name="Orphan Center Manager",
            Email="orphan@vscms.com",
            Contact="9899000099",
            Password_Hash=hash_password("Orphan@123"),
            Role="center",
            center_id=None,
            Is_Active=True
        )
        db.session.add(orphan_center_user)

        db.session.commit()

        tokens = {
            "platform_admin": generate_jwt(platform_admin),
            "owner_a": generate_jwt(owner_a),
            "owner_b": generate_jwt(owner_b),
            "mech_a": generate_jwt(mech_user_a),
            "mech_b": generate_jwt(mech_user_b),
            "cust1": generate_jwt(cust1),
            "cust2": generate_jwt(cust2),
            "orphan": generate_jwt(orphan_center_user),
        }

        data_ids = {
            "center_a_id": center_a.id,
            "center_b_id": center_b.id,
            "req_a_id": req_a.Request_ID,
            "req_b_id": req_b.Request_ID,
            "inv_a_id": inv_a.Invoice_ID,
            "pay_a_id": pay_a.Payment_ID,
            "att_a_id": att_a.Attachment_ID,
            "part_a_id": part_a.Part_ID,
            "part_b_id": part_b.Part_ID,
            "mech_a_id": mech_a.Mechanic_ID,
            "mech_b_id": mech_b.Mechanic_ID,
            "slot_a_id": slot_a.Slot_ID,
            "slot_b_id": slot_b.Slot_ID,
            "cust1_id": cust1.User_ID,
            "cust2_id": cust2.User_ID,
            "veh1_id": veh1.Vehicle_ID,
            "veh2_id": veh2.Vehicle_ID,
            "owner_a_id": owner_a.User_ID,
            "owner_b_id": owner_b.User_ID,
        }

        return tokens, data_ids


# ==============================================================================
# TEST 1: Center B sees ONLY its own pending booking (Zero Center A leaks)
# ==============================================================================

def test_center_b_isolation(client, isolation_data):
    tokens, ids = isolation_data
    auth_b = {"Authorization": f"Bearer {tokens['owner_b']}"}

    # Requests
    res = client.get("/api/requests", headers=auth_b)
    assert res.status_code == 200
    req_ids = [r["Request_ID"] for r in res.json["requests"]]
    assert ids["req_b_id"] in req_ids
    assert ids["req_a_id"] not in req_ids

    # Invoices
    res = client.get("/api/invoices", headers=auth_b)
    assert res.status_code == 200
    inv_ids = [i["Invoice_ID"] for i in res.json["invoices"]]
    assert ids["inv_a_id"] not in inv_ids
    assert len(inv_ids) == 0  # Center B has no invoices yet

    # Receipts
    res = client.get("/api/receipts", headers=auth_b)
    assert res.status_code == 200
    receipts = res.json["receipts"]
    assert len(receipts) == 0  # None of Center A's receipts leak

    # Customers (Only Customer 2 has a booking at Center B)
    res = client.get("/api/admin/customers", headers=auth_b)
    assert res.status_code == 200
    cust_ids = [c["User_ID"] for c in res.json["customers"]]
    assert ids["cust2_id"] in cust_ids
    assert ids["cust1_id"] not in cust_ids

    # Mechanics
    res = client.get("/api/center/mechanics", headers=auth_b)
    assert res.status_code == 200
    mech_ids = [m["Mechanic_ID"] for m in res.json["mechanics"]]
    assert ids["mech_b_id"] in mech_ids
    assert ids["mech_a_id"] not in mech_ids

    # Parts
    res = client.get("/api/parts", headers=auth_b)
    assert res.status_code == 200
    part_ids = [p["Part_ID"] for p in res.json["parts"]]
    assert ids["part_b_id"] in part_ids
    assert ids["part_a_id"] not in part_ids

    # Notifications
    res = client.get("/api/notifications", headers=auth_b)
    assert res.status_code == 200
    notifs = res.json["notifications"]
    for n in notifs:
        assert "Center A" not in n["Message"]


# ==============================================================================
# TEST 2: Brand-New Center C gets EMPTY results across all endpoints
# ==============================================================================

def test_brand_new_center_c_empty(client):
    # Register Center C via public registration endpoint
    reg_data = {
        "owner_name": "Owner Charlie",
        "name": "Owner Charlie",
        "email": "charlie@centerc.com",
        "phone": "9833000001",
        "password": "Password@123",
        "center_name": "Center Charlie Motors",
        "city": "Pune",
        "area": "Hinjawadi",
        "state": "Maharashtra",
        "pincode": "411057",
        "latitude": 18.5913,
        "longitude": 73.7389
    }
    reg_res = client.post("/api/centers/register", json=reg_data)
    assert reg_res.status_code == 201
    token_c = reg_res.json["token"]
    auth_c = {"Authorization": f"Bearer {token_c}"}

    # 1. Command Center KPIs: All 0s
    res = client.get("/api/admin/dashboard", headers=auth_c)
    assert res.status_code == 200
    kpis = res.json["kpis"]
    assert kpis["pending_requests"] == 0
    assert kpis["active_jobs"] == 0
    assert kpis["completed_jobs"] == 0
    assert kpis["revenue_this_month"] == 0
    assert len(res.json["recent_bookings"]) == 0

    # 2. Requests: Empty
    res = client.get("/api/requests", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["requests"]) == 0

    # 3. Center Requests: Empty
    res = client.get("/api/center/requests", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["requests"]) == 0

    # 4. Customers: Empty
    res = client.get("/api/admin/customers", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["customers"]) == 0

    # 5. Invoices: Empty
    res = client.get("/api/invoices", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["invoices"]) == 0

    # 6. Receipts: Empty
    res = client.get("/api/receipts", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["receipts"]) == 0

    # 7. Revenue Report: Total revenue = 0
    res = client.get("/api/reports/revenue", headers=auth_c)
    assert res.status_code == 200
    assert res.json["summary"]["total_revenue"] == 0
    assert len(res.json["invoices"]) == 0

    # 8. Bookings Report: Total = 0
    res = client.get("/api/reports/bookings", headers=auth_c)
    assert res.status_code == 200
    assert res.json["summary"]["total_bookings"] == 0

    # 9. Mechanic Performance: Empty
    res = client.get("/api/reports/mechanic-performance", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["mechanics"]) == 0

    # 9b. Customer Performance: Empty
    res = client.get("/api/reports/customer-performance", headers=auth_c)
    assert res.status_code == 200
    assert len(res.json["customers"]) == 0

    # 10. Center Summary Report: Completed = 0, Revenue = 0
    res = client.get("/api/center/reports/summary", headers=auth_c)
    assert res.status_code == 200
    summary = res.json["summary"]
    assert summary["pending_approval"] == 0
    assert summary["completed_jobs"] == 0
    assert summary["total_revenue"] == 0


# ==============================================================================
# TEST 3: Direct-ID attacks return 404 (Never 403 or 200)
# ==============================================================================

def test_direct_id_attacks_return_404(client, isolation_data):
    tokens, ids = isolation_data
    auth_b = {"Authorization": f"Bearer {tokens['owner_b']}"}
    auth_mech_b = {"Authorization": f"Bearer {tokens['mech_b']}"}

    # Center B probes Center A's Request
    res = client.get(f"/api/requests/{ids['req_a_id']}", headers=auth_b)
    assert res.status_code == 404

    # Center B tries to accept Center A's Request
    res = client.post(f"/api/requests/{ids['req_a_id']}/accept", headers=auth_b)
    assert res.status_code == 404

    # Center B tries to assign mechanic to Center A's Request
    res = client.post(f"/api/requests/{ids['req_a_id']}/assign", headers=auth_b, json={"mechanic_id": ids["mech_b_id"]})
    assert res.status_code == 404

    # Center B probes Center A's Invoice
    res = client.get(f"/api/invoices/{ids['inv_a_id']}", headers=auth_b)
    assert res.status_code == 404

    # Center B probes Center A's Invoice Download
    res = client.get(f"/api/invoices/{ids['inv_a_id']}/download", headers=auth_b)
    assert res.status_code == 404

    # Center B probes Center A's Receipt
    res = client.get(f"/api/payments/{ids['pay_a_id']}/receipt", headers=auth_b)
    assert res.status_code == 404

    # Center B probes Center A's Receipt PDF
    res = client.get(f"/api/payments/{ids['pay_a_id']}/receipt/pdf", headers=auth_b)
    assert res.status_code == 404

    # Center B probes Center A's Attachment
    res = client.get(f"/api/requests/{ids['req_a_id']}/attachments/{ids['att_a_id']}", headers=auth_b)
    assert res.status_code == 404

    # Center B probes Customer 1 (who only booked at Center A)
    res = client.get(f"/api/admin/customers/{ids['cust1_id']}", headers=auth_b)
    assert res.status_code == 404

    # Center B tries to update Center A's Mechanic
    res = client.put(f"/api/center/mechanics/{ids['mech_a_id']}", headers=auth_b, json={"specialization": "Hacked"})
    assert res.status_code == 404

    # Center B tries to update Center A's Part
    res = client.put(f"/api/parts/{ids['part_a_id']}", headers=auth_b, json={"price": 1.0})
    assert res.status_code == 404

    # Center B tries to update Center A's Slot
    res = client.put(f"/api/center/slots/{ids['slot_a_id']}", headers=auth_b, json={"capacity": 10})
    assert res.status_code == 404

    # Mechanic of Center B tries to view or update status of Center A job
    res = client.get(f"/api/requests/{ids['req_a_id']}", headers=auth_mech_b)
    assert res.status_code == 404
    res = client.put(f"/api/requests/{ids['req_a_id']}/status", headers=auth_mech_b, json={"status": "In Progress"})
    assert res.status_code == 404


# ==============================================================================
# TEST 4: Customer 1 booked at both centers: Center B sees ONLY B booking
# ==============================================================================

def test_customer_booked_at_both_centers(app, client, isolation_data):
    tokens, ids = isolation_data

    # Customer 1 books a service at Center B
    with app.app_context():
        req_b2 = Service_Request(
            Customer_ID=ids["cust1_id"],
            Vehicle_ID=ids["veh1_id"],
            center_id=ids["center_b_id"],
            Slot_ID=ids["slot_b_id"],
            Status="Assigned",
            Urgency="Normal",
            Problem_Description="Oil service at Center B"
        )
        db.session.add(req_b2)
        db.session.commit()
        req_b2_id = req_b2.Request_ID

    auth_b = {"Authorization": f"Bearer {tokens['owner_b']}"}
    auth_a = {"Authorization": f"Bearer {tokens['owner_a']}"}
    auth_cust1 = {"Authorization": f"Bearer {tokens['cust1']}"}

    # Center B Customer Detail shows ONLY Center B's booking for Customer 1
    res = client.get(f"/api/admin/customers/{ids['cust1_id']}", headers=auth_b)
    assert res.status_code == 200
    cust_data = res.json["customer"]
    cust_req_ids = [r["Request_ID"] for r in cust_data["Requests"]]
    assert req_b2_id in cust_req_ids
    assert ids["req_a_id"] not in cust_req_ids  # Center A booking must NOT appear!

    # Center A Customer Detail shows ONLY Center A's booking
    res = client.get(f"/api/admin/customers/{ids['cust1_id']}", headers=auth_a)
    assert res.status_code == 200
    cust_data_a = res.json["customer"]
    cust_req_ids_a = [r["Request_ID"] for r in cust_data_a["Requests"]]
    assert ids["req_a_id"] in cust_req_ids_a
    assert req_b2_id not in cust_req_ids_a  # Center B booking must NOT appear!

    # Customer 1 sees BOTH bookings in their own portal
    res = client.get("/api/requests", headers=auth_cust1)
    assert res.status_code == 200
    all_cust_reqs = [r["Request_ID"] for r in res.json["requests"]]
    assert ids["req_a_id"] in all_cust_reqs
    assert req_b2_id in all_cust_reqs


# ==============================================================================
# TEST 5: Reports and CSV exports for Center B contain ONLY Center B data
# ==============================================================================

def test_reports_and_csv_exports_scoped(client, isolation_data):
    tokens, ids = isolation_data
    auth_b = {"Authorization": f"Bearer {tokens['owner_b']}"}

    # Revenue report: Center B has 0 paid invoices
    res = client.get("/api/reports/revenue", headers=auth_b)
    assert res.status_code == 200
    assert res.json["summary"]["total_revenue"] == 0.0
    assert len(res.json["invoices"]) == 0

    # Revenue CSV
    res = client.get("/api/reports/revenue?export=csv", headers=auth_b)
    assert res.status_code == 200
    csv_text = res.data.decode("utf-8")
    assert "INV-A-0001" not in csv_text

    # Bookings report: Center B has exactly 1 booking
    res = client.get("/api/reports/bookings", headers=auth_b)
    assert res.status_code == 200
    assert res.json["summary"]["total_bookings"] == 1
    assert res.json["bookings"][0]["Request_ID"] == ids["req_b_id"]

    # Bookings CSV
    res = client.get("/api/reports/bookings?export=csv", headers=auth_b)
    assert res.status_code == 200
    csv_text = res.data.decode("utf-8")
    assert f"#{ids['req_b_id']}" in csv_text
    assert f"#{ids['req_a_id']}" not in csv_text

    # Inventory report: Center B has only PART-B-PAD
    res = client.get("/api/reports/inventory", headers=auth_b)
    assert res.status_code == 200
    parts = res.json["parts"]
    assert len(parts) == 1
    assert parts[0]["sku"] == "PART-B-PAD"

    # Customer Performance report: Center B has only cust2 (who booked at Center B)
    res = client.get("/api/reports/customer-performance", headers=auth_b)
    assert res.status_code == 200
    custs = res.json["customers"]
    assert len(custs) == 1
    assert custs[0]["customer_id"] == ids["cust2_id"]
    # cust1 (who booked at Center A) must NEVER appear in Center B's customer report!
    assert all(c["customer_id"] != ids["cust1_id"] for c in custs)

    # Customer Performance CSV
    res = client.get("/api/reports/customer-performance?export=csv", headers=auth_b)
    assert res.status_code == 200
    csv_text = res.data.decode("utf-8")
    assert "Customer Two" in csv_text
    assert "Customer One" not in csv_text


# ==============================================================================
# TEST 6: User with role center and NULL center_id gets 403 on center routes
# ==============================================================================

def test_null_center_id_gets_403(client, isolation_data):
    tokens, _ = isolation_data
    auth_orphan = {"Authorization": f"Bearer {tokens['orphan']}"}

    # Center routes must all return 403 Forbidden (Never fall back to any center!)
    assert client.get("/api/admin/dashboard", headers=auth_orphan).status_code == 403
    assert client.get("/api/requests", headers=auth_orphan).status_code == 403
    assert client.get("/api/center/requests", headers=auth_orphan).status_code == 403
    assert client.get("/api/admin/customers", headers=auth_orphan).status_code == 403
    assert client.get("/api/invoices", headers=auth_orphan).status_code == 403
    assert client.get("/api/receipts", headers=auth_orphan).status_code == 403
    assert client.get("/api/center/mechanics", headers=auth_orphan).status_code == 403
    assert client.get("/api/parts", headers=auth_orphan).status_code == 403
    assert client.get("/api/reports/revenue", headers=auth_orphan).status_code == 403
    assert client.get("/api/reports/bookings", headers=auth_orphan).status_code == 403
    assert client.get("/api/reports/customer-performance", headers=auth_orphan).status_code == 403


# ==============================================================================
# TEST 7: Generic Leak Scanner across all url_map endpoints
# ==============================================================================

def test_generic_leak_scanner(app, client, isolation_data):
    tokens, ids = isolation_data
    auth_b = {"Authorization": f"Bearer {tokens['owner_b']}"}

    forbidden_patterns = [
        f'"Request_ID": {ids["req_a_id"]}',
        f'"Invoice_ID": {ids["inv_a_id"]}',
        f'"Payment_ID": {ids["pay_a_id"]}',
        f'"Attachment_ID": {ids["att_a_id"]}',
        "INV-A-0001",
        "TXN-A-9999",
        "customer1@test.com",
        "Center Alpha Auto",
        "Alpha Synthetic Oil",
        "engine_bay.jpg"
    ]

    # Test all GET endpoints callable by center role
    tested_endpoints = 0
    for rule in app.url_map.iter_rules():
        if "GET" not in rule.methods:
            continue
        rule_str = rule.rule
        if not rule_str.startswith("/api"):
            continue
        if rule_str in ["/api/health", "/api/centers", "/api/locations/cities", "/api/locations/areas", "/api/locations/nearest"] or rule_str.startswith("/api/platform") or "/auth/" in rule_str or "/verify-code" in rule_str:
            continue

        # Build url by substituting params with Center B ids where required
        url = rule_str
        if "<int:request_id>" in url:
            url = url.replace("<int:request_id>", str(ids["req_b_id"]))
        if "<int:mechanic_id>" in url:
            url = url.replace("<int:mechanic_id>", str(ids["mech_b_id"]))
        if "<int:part_id>" in url:
            url = url.replace("<int:part_id>", str(ids["part_b_id"]))
        if "<int:slot_id>" in url:
            url = url.replace("<int:slot_id>", str(ids["slot_b_id"]))
        if "<int:user_id>" in url:
            url = url.replace("<int:user_id>", str(ids["cust2_id"]))
        if "<int:vehicle_id>" in url:
            url = url.replace("<int:vehicle_id>", str(ids["veh2_id"]))
        if "<" in url:
            # Skip unmapped parameters
            continue

        res = client.get(url, headers=auth_b)
        if res.status_code == 200 and res.is_json:
            response_text = json.dumps(res.json)
            for pattern in forbidden_patterns:
                assert pattern not in response_text, f"LEAK DETECTED: Pattern '{pattern}' leaked in {url} for Center B!"
            tested_endpoints += 1

    assert tested_endpoints >= 15, f"Expected to test at least 15 endpoints, tested {tested_endpoints}"


# ==============================================================================
# TEST 8: Platform Admin & Customer views
# ==============================================================================

def test_platform_admin_and_customer_views(client, isolation_data):
    tokens, ids = isolation_data
    auth_platform = {"Authorization": f"Bearer {tokens['platform_admin']}"}
    auth_cust1 = {"Authorization": f"Bearer {tokens['cust1']}"}

    # Platform admin sees platform-wide stats
    res = client.get("/api/platform/stats", headers=auth_platform)
    assert res.status_code == 200
    assert res.json["stats"]["total_centers"] >= 2

    # Platform admin lists all centers
    res = client.get("/api/platform/centers", headers=auth_platform)
    assert res.status_code == 200
    center_names = [c["name"] for c in res.json["centers"]]
    assert "Center Alpha Auto" in center_names
    assert "Center Beta Motors" in center_names

    # Customer 1 sees their vehicle and booking
    res = client.get("/api/vehicles", headers=auth_cust1)
    assert res.status_code == 200
    plates = [v["Registration_Number"] for v in res.json["vehicles"]]
    assert "MH 12 AB 1111" in plates
    assert "MH 12 CD 2222" not in plates  # Customer 2's car is NOT visible to Customer 1!
