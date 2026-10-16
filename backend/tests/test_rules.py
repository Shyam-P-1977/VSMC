import io
import os
import sys
import pytest
from datetime import datetime, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from config import TestConfig
from extensions import db, hash_password, generate_jwt
from models import (
    User, Mechanic, Vehicle, Service, Time_Slot, Service_Request,
    Request_Service_Item, Spare_Part, Job_Part_Used, Job_Labour,
    Invoice, Payment, Service_Center, Center_Service
)
from services.booking_service import ensure_slots_for_date

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        try:
            with db.engine.connect() as conn:
                conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
                db.metadata.drop_all(bind=conn)
                conn.commit()
        except Exception:
            pass

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_tokens(app):
    with app.app_context():
        # Service Center 1 (Approved)
        center1 = Service_Center(
            id=1,
            name="Pune Central Auto Care",
            email="center1@test.com",
            phone="9999999991",
            address="101 FC Road",
            city="Pune",
            area="Shivajinagar",
            state="Maharashtra",
            latitude=18.5314,
            longitude=73.8446,
            approval_status="Approved",
            is_active=True,
            avg_rating=4.8
        )
        # Service Center 2 (Approved, farther away in Mumbai)
        center2 = Service_Center(
            id=2,
            name="Mumbai Coastal AutoCare",
            email="center2@test.com",
            phone="9999999992",
            address="Hill Road Bandra",
            city="Mumbai",
            area="Bandra West",
            state="Maharashtra",
            latitude=19.0596,
            longitude=72.8295,
            approval_status="Approved",
            is_active=True,
            avg_rating=4.9
        )
        # Service Center 3 (Pending approval - should NOT show to customers)
        center3 = Service_Center(
            id=3,
            name="Unapproved Garage",
            email="center3@test.com",
            phone="9999999993",
            address="Pending Lane",
            city="Pune",
            area="Kothrud",
            state="Maharashtra",
            latitude=18.5074,
            longitude=73.8077,
            approval_status="Pending",
            is_active=False,
            avg_rating=0.0
        )
        db.session.add_all([center1, center2, center3])
        db.session.flush()

        # Users
        admin = User(
            Name="Center One Admin",
            Email="admin@test.com",
            Contact="9999999999",
            Password_Hash=hash_password("Admin@123"),
            Role="center",
            center_id=center1.id,
            Is_Active=True
        )
        center2_owner = User(
            Name="Center Two Owner",
            Email="center2owner@test.com",
            Contact="9999999995",
            Password_Hash=hash_password("Center@123"),
            Role="center",
            center_id=center2.id,
            Is_Active=True
        )
        cust1 = User(
            Name="Customer One",
            Email="cust1@test.com",
            Contact="9888888881",
            Password_Hash=hash_password("Cust@123"),
            Role="customer",
            city="Pune",
            area="Shivajinagar",
            state="Maharashtra",
            latitude=18.5314,
            longitude=73.8446,
            Is_Active=True
        )
        cust2 = User(
            Name="Customer Two",
            Email="cust2@test.com",
            Contact="9888888882",
            Password_Hash=hash_password("Cust@123"),
            Role="customer",
            Is_Active=True
        )
        mech_user1 = User(
            Name="Mechanic One",
            Email="mech1@test.com",
            Contact="9777777771",
            Password_Hash=hash_password("Mech@123"),
            Role="mechanic",
            center_id=center1.id,
            Is_Active=True
        )
        mech_user2 = User(
            Name="Mechanic Two (Center 2)",
            Email="mech2@test.com",
            Contact="9777777772",
            Password_Hash=hash_password("Mech@123"),
            Role="mechanic",
            center_id=center2.id,
            Is_Active=True
        )
        platform_user = User(
            Name="Platform Admin",
            Email="platform@test.com",
            Contact="9666666666",
            Password_Hash=hash_password("Platform@123"),
            Role="platform_admin",
            Is_Active=True
        )
        db.session.add_all([admin, center2_owner, cust1, cust2, mech_user1, mech_user2, platform_user])
        db.session.flush()

        center1.owner_user_id = admin.User_ID
        center2.owner_user_id = center2_owner.User_ID

        mech1 = Mechanic(User_ID=mech_user1.User_ID, center_id=center1.id, Specialization="Engines", Is_Available=True)
        mech2 = Mechanic(User_ID=mech_user2.User_ID, center_id=center2.id, Specialization="Brakes", Is_Available=True)
        db.session.add_all([mech1, mech2])

        # Vehicles
        veh1 = Vehicle(
            Customer_ID=cust1.User_ID,
            Registration_Number="MH12AB1234",
            Make="Hyundai",
            Model="Creta",
            Year=2022,
            Fuel_Type="Petrol",
            Color="Black"
        )
        veh2 = Vehicle(
            Customer_ID=cust2.User_ID,
            Registration_Number="MH12CD5678",
            Make="Honda",
            Model="City",
            Year=2021,
            Fuel_Type="Petrol",
            Color="White"
        )
        # Service catalog & Center service
        svc = Service(
            Name="General Service",
            Description="Periodic service",
            Base_Price=2000.0,
            Estimated_Hours=2.0,
            Is_Active=True
        )
        db.session.add_all([veh1, veh2, svc])
        db.session.flush()

        cs1 = Center_Service(center_id=center1.id, service_id=svc.Service_ID, price=1999.0, estimated_hours=2.0, is_active=True)
        cs2 = Center_Service(center_id=center2.id, service_id=svc.Service_ID, price=2200.0, estimated_hours=2.0, is_active=True)
        db.session.add_all([cs1, cs2])

        # Spare parts
        part1 = Spare_Part(center_id=center1.id, Name="Brake Pads", Price=1500.0, Quantity_In_Stock=10, Min_Threshold=3)
        part2 = Spare_Part(center_id=center2.id, Name="Oil Filter", Price=450.0, Quantity_In_Stock=5, Min_Threshold=2)
        db.session.add_all([part1, part2])

        # Slots for center 1
        slots1 = ensure_slots_for_date("2026-10-20", center_id=center1.id)
        # Slots for center 2
        slots2 = ensure_slots_for_date("2026-10-20", center_id=center2.id)

        db.session.commit()

        return {
            "admin": (admin.User_ID, generate_jwt(admin)),
            "center2_owner": (center2_owner.User_ID, generate_jwt(center2_owner)),
            "platform": (platform_user.User_ID, generate_jwt(platform_user)),
            "cust1": (cust1.User_ID, generate_jwt(cust1), veh1.Vehicle_ID),
            "cust2": (cust2.User_ID, generate_jwt(cust2), veh2.Vehicle_ID),
            "mech1": (mech_user1.User_ID, generate_jwt(mech_user1), mech1.Mechanic_ID),
            "mech2": (mech_user2.User_ID, generate_jwt(mech_user2), mech2.Mechanic_ID),
            "center1_id": center1.id,
            "center2_id": center2.id,
            "center3_id": center3.id,
            "slot": slots1[0].Slot_ID,
            "slot_center2": slots2[0].Slot_ID,
            "service": svc.Service_ID,
            "part": part1.Part_ID
        }

# 1. TEST DUPLICATE VEHICLE REGISTRATION
def test_duplicate_vehicle_registration(client, auth_tokens):
    _, token, _ = auth_tokens["cust2"]
    res = client.post('/api/vehicles', json={
        "registration_number": "mh12 ab 1234 ",
        "make": "Toyota",
        "model": "Innova",
        "year": 2023,
        "fuel_type": "Diesel",
        "color": "Silver"
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 409
    assert res.json["code"] == "DUPLICATE_REGISTRATION"

# 2. TEST DUPLICATE EMAIL REGISTRATION
def test_duplicate_email_registration(client, auth_tokens):
    res = client.post('/api/auth/register', json={
        "name": "Duplicate Tester",
        "email": "cust1@test.com",
        "contact": "9111111111",
        "password": "Password@123"
    })
    assert res.status_code == 409
    assert res.json["code"] == "DUPLICATE_EMAIL"

# 3. TEST NEARBY-CENTER FILTERING, DISTANCE ORDERING & UNAPPROVED HIDDEN
def test_nearby_center_filtering_and_distance_ordering(client, auth_tokens):
    # Customer at Pune (18.5314, 73.8446)
    res = client.get('/api/centers?lat=18.5314&lng=73.8446&radius=50')
    assert res.status_code == 200
    centers = res.json["centers"]

    # Center 3 (Pending) MUST NOT be present
    center_ids = [c["id"] for c in centers]
    assert auth_tokens["center3_id"] not in center_ids

    # Center 1 (Pune) should be closer than Center 2 (Mumbai)
    assert centers[0]["id"] == auth_tokens["center1_id"]
    assert centers[0]["distance_km"] < 5.0

# 4. TEST OVERBOOKING & SLOT UNAVAILABLE RESPONSE WITH ALTERNATES
def test_overbooking_slot_capacity(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    center_id = auth_tokens["center1_id"]
    _, cust1_token, veh1_id = auth_tokens["cust1"]
    _, cust2_token, veh2_id = auth_tokens["cust2"]

    # Slot default capacity is 3. Book 3 times
    for i in range(3):
        res = client.post('/api/requests', json={
            "center_id": center_id,
            "vehicle_id": veh1_id,
            "slot_id": slot_id,
            "service_ids": [svc_id],
            "urgency": "Routine"
        }, headers={"Authorization": f"Bearer {cust1_token}"})
        assert res.status_code == 201

    # 4th booking on same slot MUST fail with 409 and alternate suggestions
    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh2_id,
        "slot_id": slot_id,
        "service_ids": [svc_id],
        "urgency": "Routine"
    }, headers={"Authorization": f"Bearer {cust2_token}"})
    assert res.status_code == 409
    assert res.json["code"] == "SLOT_FULL"
    assert "alternate_slots" in res.json
    assert len(res.json["alternate_slots"]) > 0

# 5. TEST REJECT WITHOUT REASON FAILS AND REJECT RELEASES SLOT
def test_reject_workflow_and_slot_release(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    center_id = auth_tokens["center1_id"]
    _, cust1_token, veh1_id = auth_tokens["cust1"]
    _, admin_token = auth_tokens["admin"]

    # Customer creates request
    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh1_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust1_token}"})
    assert res.status_code == 201
    req_id = res.json["request"]["Request_ID"]

    # Reject without reason fails
    bad_reject = client.post(f'/api/requests/{req_id}/reject', json={
        "reason": ""
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert bad_reject.status_code == 400
    assert bad_reject.json["code"] == "REASON_REQUIRED"

    # Reject with short reason fails (< 10 chars)
    short_reject = client.post(f'/api/requests/{req_id}/reject', json={
        "reason": "busy"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert short_reject.status_code == 400
    assert short_reject.json["code"] == "REASON_REQUIRED"

    # Reject with valid reason succeeds
    good_reject = client.post(f'/api/requests/{req_id}/reject', json={
        "reason": "Workshop capacity exceeded for electrical repairs today."
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert good_reject.status_code == 200
    assert good_reject.json["request"]["Status"] == "Rejected"
    assert "Workshop capacity exceeded" in good_reject.json["request"]["rejection_reason"]

# 6. TEST ACCEPT THEN ASSIGN & CUSTOMER SEES MECHANIC DETAILS ONLY AFTER ASSIGNMENT
def test_accept_and_assign_mechanic_visibility(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    center_id = auth_tokens["center1_id"]
    _, cust1_token, veh1_id = auth_tokens["cust1"]
    _, admin_token = auth_tokens["admin"]
    _, _, mech1_id = auth_tokens["mech1"]

    # 1. Customer creates request -> Pending Approval
    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh1_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust1_token}"})
    req_id = res.json["request"]["Request_ID"]

    # Customer checks request detail: Mechanic details MUST be None before assignment
    view_before = client.get(f'/api/requests/{req_id}', headers={"Authorization": f"Bearer {cust1_token}"})
    assert view_before.json["request"]["Mechanic"] is None
    assert view_before.json["request"]["Mechanic_ID"] is None

    # 2. Center accepts request
    acc_res = client.post(f'/api/requests/{req_id}/accept', headers={"Authorization": f"Bearer {admin_token}"})
    assert acc_res.status_code == 200
    assert acc_res.json["request"]["Status"] == "Accepted"

    # Customer still does not see mechanic (none assigned yet)
    view_accepted = client.get(f'/api/requests/{req_id}', headers={"Authorization": f"Bearer {cust1_token}"})
    assert view_accepted.json["request"]["Mechanic"] is None

    # 3. Center assigns mechanic
    assign_res = client.post(f'/api/requests/{req_id}/assign', json={
        "mechanic_id": mech1_id
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert assign_res.status_code == 200
    assert assign_res.json["request"]["Status"] == "Assigned"

    # Customer checks request detail: Mechanic details NOW visible!
    view_after = client.get(f'/api/requests/{req_id}', headers={"Authorization": f"Bearer {cust1_token}"})
    assert view_after.json["request"]["Mechanic"] is not None
    assert view_after.json["request"]["Mechanic"]["name"] == "Mechanic One"
    assert view_after.json["request"]["Mechanic"]["specialization"] == "Engines"

# 7. TEST ASSIGNING MECHANIC FROM ANOTHER CENTER FAILS (403)
def test_cross_center_mechanic_assignment_fails(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    center_id = auth_tokens["center1_id"]
    _, cust1_token, veh1_id = auth_tokens["cust1"]
    _, admin_token = auth_tokens["admin"]
    _, _, mech2_id = auth_tokens["mech2"] # Mechanic 2 belongs to Center 2

    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh1_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust1_token}"})
    req_id = res.json["request"]["Request_ID"]

    # Try assigning Center 2 mechanic to Center 1 request -> MUST return 403
    assign_cross = client.post(f'/api/requests/{req_id}/assign', json={
        "mechanic_id": mech2_id
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert assign_cross.status_code == 403
    assert assign_cross.json["code"] in ["CROSS_CENTER_ASSIGNMENT_FORBIDDEN", "FORBIDDEN"]

# 8. TEST CENTER A CANNOT READ CENTER B REQUESTS (ISOLATION)
def test_center_data_isolation(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    center_id = auth_tokens["center1_id"]
    _, cust1_token, veh1_id = auth_tokens["cust1"]
    _, center2_token = auth_tokens["center2_owner"]

    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh1_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust1_token}"})
    req_id = res.json["request"]["Request_ID"]

    # Center 2 manager attempts to view Center 1's request -> MUST be 404 (or 403)
    cross_read = client.get(f'/api/requests/{req_id}', headers={"Authorization": f"Bearer {center2_token}"})
    assert cross_read.status_code in (403, 404)

# 9. TEST STOCK DEDUCTION AND INSUFFICIENT STOCK
def test_stock_deduction_and_insufficient_stock(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    part_id = auth_tokens["part"]
    center_id = auth_tokens["center1_id"]
    _, cust_token, veh_id = auth_tokens["cust1"]
    _, admin_token = auth_tokens["admin"]
    _, mech1_token, mech1_id = auth_tokens["mech1"]

    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust_token}"})
    req_id = res.json["request"]["Request_ID"]

    # Assign
    client.post(f'/api/requests/{req_id}/assign', json={"mechanic_id": mech1_id}, headers={"Authorization": f"Bearer {admin_token}"})
    client.put(f'/api/requests/{req_id}/status', json={"status": "In Progress"}, headers={"Authorization": f"Bearer {mech1_token}"})

    # Add 2 parts (in stock: 10)
    add_res = client.post(f'/api/mechanic/requests/{req_id}/parts', json={"part_id": part_id, "quantity": 2}, headers={"Authorization": f"Bearer {mech1_token}"})
    assert add_res.status_code == 201

    # Request 100 parts -> exceeds stock
    over_res = client.post(f'/api/mechanic/requests/{req_id}/parts', json={"part_id": part_id, "quantity": 100}, headers={"Authorization": f"Bearer {mech1_token}"})
    assert over_res.status_code == 400
    assert over_res.json["code"] == "INSUFFICIENT_STOCK"

# 10. TEST INVOICE CALCULATION, RECEIPT WITH PARTS AND LABOUR, AND PAID IMMUTABILITY
def test_invoice_calculation_and_receipt_lines(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    part_id = auth_tokens["part"]
    center_id = auth_tokens["center1_id"]
    _, cust_token, veh_id = auth_tokens["cust1"]
    _, admin_token = auth_tokens["admin"]
    _, mech1_token, mech1_id = auth_tokens["mech1"]

    res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust_token}"})
    req_id = res.json["request"]["Request_ID"]

    client.post(f'/api/requests/{req_id}/assign', json={"mechanic_id": mech1_id}, headers={"Authorization": f"Bearer {admin_token}"})
    client.put(f'/api/requests/{req_id}/status', json={"status": "In Progress"}, headers={"Authorization": f"Bearer {mech1_token}"})

    # Log parts and labour
    client.post(f'/api/mechanic/requests/{req_id}/parts', json={"part_id": part_id, "quantity": 1}, headers={"Authorization": f"Bearer {mech1_token}"})
    client.post(f'/api/mechanic/requests/{req_id}/labour', json={"description": "Brake System Overhaul", "hours": 2.0, "rate_per_hour": 500.0, "repair_notes": "Replaced worn pads and bled hydraulic lines."}, headers={"Authorization": f"Bearer {mech1_token}"})

    # Complete job -> generates invoice with line items
    comp_res = client.post(f'/api/mechanic/requests/{req_id}/complete', json={"discount": 100.0}, headers={"Authorization": f"Bearer {mech1_token}"})
    assert comp_res.status_code == 200
    inv = comp_res.json["invoice"]
    assert inv["Status"] == "Unpaid"
    inv_id = inv["Invoice_ID"]

    # Customer pays via UPI
    pay_res = client.post('/api/payments/process', json={
        "invoice_id": inv_id,
        "method": "UPI",
        "details": {"upi_id": "test@okaxis"}
    }, headers={"Authorization": f"Bearer {cust_token}"})
    assert pay_res.status_code == 200
    payment_id = pay_res.json["payment"].get("payment_id") or pay_res.json["payment"].get("Payment_ID")

    # Fetch detailed receipt
    receipt_res = client.get(f'/api/payments/{payment_id}/receipt', headers={"Authorization": f"Bearer {cust_token}"})
    assert receipt_res.status_code == 200
    receipt = receipt_res.json["receipt"]
    assert receipt["status"] == "PAID"
    assert "Brake Pads" in [i["description"] for i in receipt["items"]]
    assert any("Brake System Overhaul" in i["description"] for i in receipt["items"])
    assert "Replaced worn pads" in receipt["work_performed"][0]

    # Verify paid invoice cannot be modified
    mod_res = client.put(f'/api/invoices/{inv_id}', json={"Total_Amount": 100}, headers={"Authorization": f"Bearer {admin_token}"})
    assert mod_res.status_code == 409
    assert mod_res.json["code"] == "PAID_INVOICE_IMMUTABLE"

# 11. TEST PAYMENT FAILURE AND RETRY
def test_payment_failure_and_retry(client, auth_tokens):
    slot_id = auth_tokens["slot"]
    svc_id = auth_tokens["service"]
    center_id = auth_tokens["center1_id"]
    _, cust_token, veh_id = auth_tokens["cust1"]
    _, admin_token = auth_tokens["admin"]
    _, mech1_token, mech1_id = auth_tokens["mech1"]

    req_res = client.post('/api/requests', json={
        "center_id": center_id,
        "vehicle_id": veh_id,
        "slot_id": slot_id,
        "service_ids": [svc_id]
    }, headers={"Authorization": f"Bearer {cust_token}"})
    req_id = req_res.json["request"]["Request_ID"]

    client.post(f'/api/requests/{req_id}/assign', json={"mechanic_id": mech1_id}, headers={"Authorization": f"Bearer {admin_token}"})
    client.put(f'/api/requests/{req_id}/status', json={"status": "In Progress"}, headers={"Authorization": f"Bearer {mech1_token}"})
    client.post(f'/api/mechanic/requests/{req_id}/labour', json={"description": "Inspection", "hours": 1.0, "rate_per_hour": 400.0}, headers={"Authorization": f"Bearer {mech1_token}"})
    comp_res = client.post(f'/api/mechanic/requests/{req_id}/complete', json={"no_parts_used": True}, headers={"Authorization": f"Bearer {mech1_token}"})
    inv_id = comp_res.json["invoice"]["Invoice_ID"]

    # Failing card (ending in 0000)
    fail_res = client.post('/api/payments/process', json={
        "invoice_id": inv_id,
        "method": "Card",
        "details": {"card_number": "4111111111110000", "expiry": "12/28", "cvv": "123"}
    }, headers={"Authorization": f"Bearer {cust_token}"})
    assert fail_res.status_code == 400
    assert fail_res.json["code"] == "PAYMENT_FAILED"

    # Retry with valid UPI -> Succeeds
    retry_res = client.post('/api/payments/process', json={
        "invoice_id": inv_id,
        "method": "UPI",
        "details": {"upi_id": "success@okhdfc"}
    }, headers={"Authorization": f"Bearer {cust_token}"})
    assert retry_res.status_code == 200
    assert retry_res.json["success"] is True

# 12. TEST INACTIVE MECHANIC LOGIN BLOCKED
def test_inactive_mechanic_login_blocked(client, auth_tokens):
    user_id, admin_token = auth_tokens["admin"]
    mech_user_id, mech1_token, mech_profile_id = auth_tokens["mech1"]

    # Deactivate mechanic
    deact_res = client.put(f'/api/admin/mechanics/{mech_profile_id}/deactivate', headers={"Authorization": f"Bearer {admin_token}"})
    assert deact_res.status_code == 200

    # Attempt login with deactivated mechanic account
    res = client.post('/api/auth/login', json={
        "email": "mech1@test.com",
        "password": "Mech@123",
        "role": "mechanic"
    })
    assert res.status_code == 403
    assert res.json["code"] == "ACCOUNT_DEACTIVATED"
