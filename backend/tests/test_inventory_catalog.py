import pytest
from datetime import datetime
from extensions import db, hash_password, generate_jwt
from models import (
    User, Mechanic, Service_Center, Spare_Part, Stock_Adjustment,
    Service_Request, Job_Part_Used, Service, Request_Service_Item, Vehicle, Time_Slot
)
from services.inventory_service import (
    seed_default_parts, record_stock_adjustment, add_part_to_job
)
from data.default_parts import DEFAULT_SPARE_PARTS, calculate_stock_status


def make_center(center_id, name="Test Workshop", code=None, owner_user_id=None):
    return Service_Center(
        id=center_id,
        name=name,
        center_code=code or f"VSC-TST-{center_id}",
        owner_user_id=owner_user_id,
        email=f"center{center_id}@test.com",
        phone="9876543210",
        address="123 Test St",
        city="Pune",
        area="Shivajinagar",
        latitude=18.52,
        longitude=73.85,
        approval_status="Approved",
        is_active=True
    )


def make_vehicle(customer_id, reg="MH12AB1234"):
    return Vehicle(
        Customer_ID=customer_id,
        Registration_Number=reg,
        Make="Honda",
        Model="City",
        Year=2022,
        Fuel_Type="Petrol",
        Color="White"
    )


def make_slot(center_id):
    return Time_Slot(
        center_id=center_id,
        Date="2026-10-15",
        Start_Time="10:00",
        End_Time="11:00",
        Capacity=3,
        Booked_Count=1
    )


def test_seed_default_parts_creates_44_parts(app):
    with app.app_context():
        center = make_center(101, "Test Workshop 101", "VSC-PUN-T101")
        db.session.add(center)
        db.session.commit()

        res = seed_default_parts(center.id)
        assert res["added"] == 44
        assert res["skipped"] == 0

        parts = Spare_Part.query.filter_by(center_id=center.id).all()
        assert len(parts) == 44

        # Check expected initial conditions
        elc_007 = Spare_Part.query.filter_by(center_id=center.id, sku="ELC-007").first()
        assert elc_007 is not None
        assert elc_007.Quantity_In_Stock == 0
        assert elc_007.stock_status == "Out of stock"

        elc_001 = Spare_Part.query.filter_by(center_id=center.id, sku="ELC-001").first()
        assert elc_001 is not None
        assert elc_001.Quantity_In_Stock == 2
        assert elc_001.Min_Threshold == 3
        assert elc_001.stock_status == "Low stock"


def test_seed_default_parts_idempotent_and_preserves_existing(app):
    with app.app_context():
        center = make_center(102, "Test Workshop 102", "VSC-PUN-T102")
        db.session.add(center)
        db.session.commit()

        # Seed once
        res1 = seed_default_parts(center.id)
        assert res1["added"] == 44

        # Modify one part's stock and price
        eng_001 = Spare_Part.query.filter_by(center_id=center.id, sku="ENG-001").first()
        eng_001.Quantity_In_Stock = 99
        eng_001.Price = 1200.0
        db.session.commit()

        # Seed a second time
        res2 = seed_default_parts(center.id)
        assert res2["added"] == 0
        assert res2["skipped"] == 44

        # Verify existing row was not touched
        refreshed = Spare_Part.query.filter_by(center_id=center.id, sku="ENG-001").first()
        assert refreshed.Quantity_In_Stock == 99
        assert refreshed.Price == 1200.0


def test_two_centers_have_independent_stock(app):
    with app.app_context():
        c1 = make_center(201, "Workshop Alpha", "VSC-PUN-A201")
        c2 = make_center(202, "Workshop Beta", "VSC-MUM-B202")
        db.session.add_all([c1, c2])
        db.session.commit()

        seed_default_parts(c1.id)
        seed_default_parts(c2.id)

        p1 = Spare_Part.query.filter_by(center_id=c1.id, sku="BRK-001").first()
        p2 = Spare_Part.query.filter_by(center_id=c2.id, sku="BRK-001").first()

        assert p1.Quantity_In_Stock == 20
        assert p2.Quantity_In_Stock == 20

        # Adjust c1's stock
        record_stock_adjustment(p1.Part_ID, delta=-5, reason="Used in demo")
        
        db.session.refresh(p1)
        db.session.refresh(p2)

        assert p1.Quantity_In_Stock == 15
        assert p2.Quantity_In_Stock == 20  # Completely untouched


def test_stock_adjustment_cannot_go_below_zero(app):
    with app.app_context():
        c = make_center(301, "Adjust Center", "VSC-ADJ-301")
        db.session.add(c)
        db.session.commit()
        seed_default_parts(c.id)

        part = Spare_Part.query.filter_by(center_id=c.id, sku="TYR-001").first()
        assert part.Quantity_In_Stock == 8

        # Valid adjustment
        updated, adj = record_stock_adjustment(part.Part_ID, delta=5, reason="Restock")
        assert updated.Quantity_In_Stock == 13
        assert adj.delta == 5

        # Invalid adjustment below 0
        with pytest.raises(ValueError) as exc:
            record_stock_adjustment(part.Part_ID, delta=-20, reason="Exceeding deduction")
        assert "cannot be negative" in str(exc.value)

        # Quantity should still be 13
        db.session.refresh(part)
        assert part.Quantity_In_Stock == 13


def test_load_defaults_api_endpoint(client, app):
    with app.app_context():
        user = User(
            Name="Center Owner",
            Email="owner_test@vscms.com",
            Contact="9998887771",
            Password_Hash=hash_password("Pass@123"),
            Role="center",
            Is_Active=True
        )
        db.session.add(user)
        db.session.flush()

        center = make_center(401, "Load Defaults Workshop", "VSC-PUN-401", owner_user_id=user.User_ID)
        db.session.add(center)
        db.session.flush()
        user.center_id = center.id
        db.session.commit()

        token = generate_jwt(user)

    # Call /api/center/parts/load-defaults
    res = client.post(
        '/api/center/parts/load-defaults',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["added"] == 44
    assert data["skipped"] == 0

    # Call second time -> 0 added, 44 skipped
    res2 = client.post(
        '/api/center/parts/load-defaults',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["added"] == 0
    assert data2["skipped"] == 44


def test_mechanic_parts_options_and_suggested(client, app):
    with app.app_context():
        center = make_center(501, "Mechanic Center", "VSC-PUN-501")
        db.session.add(center)
        db.session.flush()

        m_user = User(
            Name="Mech Suresh",
            Email="suresh@vscms.com",
            Contact="9111111111",
            Password_Hash=hash_password("Mech@123"),
            Role="mechanic",
            center_id=center.id,
            Is_Active=True
        )
        db.session.add(m_user)
        db.session.flush()

        mech = Mechanic(
            User_ID=m_user.User_ID,
            center_id=center.id,
            Specialization="Brakes",
            Is_Available=True
        )
        db.session.add(mech)

        # Catalog service Brake Repair
        svc = Service(Name="Brake Repair", Base_Price=1299.0, Estimated_Hours=1.5, Is_Active=True)
        db.session.add(svc)
        db.session.flush()

        # Customer & Vehicle & Slot
        cust = User(Name="Customer Ravi", Email="ravi@test.com", Contact="9222222222", Password_Hash="x", Role="customer")
        db.session.add(cust)
        db.session.flush()

        veh = make_vehicle(cust.User_ID, "MH12AB5001")
        db.session.add(veh)
        db.session.flush()

        slot = make_slot(center.id)
        db.session.add(slot)
        db.session.flush()

        req = Service_Request(
            Customer_ID=cust.User_ID,
            Vehicle_ID=veh.Vehicle_ID,
            Slot_ID=slot.Slot_ID,
            center_id=center.id,
            Mechanic_ID=mech.Mechanic_ID,
            Status="In Progress"
        )
        db.session.add(req)
        db.session.flush()

        db.session.add(Request_Service_Item(Request_ID=req.Request_ID, Service_ID=svc.Service_ID, Unit_Price_At_Time=svc.Base_Price))
        db.session.commit()

        seed_default_parts(center.id)
        m_token = generate_jwt(m_user)
        req_id = req.Request_ID

    res = client.get(
        f'/api/mechanic/jobs/{req_id}/parts-options',
        headers={"Authorization": f"Bearer {m_token}"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "suggested_parts" in data
    assert "categories" in data
    # Brake Repair maps to BRK-001, BRK-002, BRK-003, BRK-004
    suggested_skus = [p["sku"] for p in data["suggested_parts"]]
    assert "BRK-001" in suggested_skus
    assert "BRK-002" in suggested_skus


def test_cannot_log_out_of_stock_part(app):
    with app.app_context():
        c = make_center(601, "Stock Workshop", "VSC-601")
        db.session.add(c)
        db.session.flush()
        seed_default_parts(c.id)

        cust = User(Name="Cust", Email="c601@test.com", Contact="9601000000", Password_Hash="x", Role="customer")
        db.session.add(cust)
        db.session.flush()

        veh = make_vehicle(cust.User_ID, "MH12AB6001")
        db.session.add(veh)
        db.session.flush()

        slot = make_slot(c.id)
        db.session.add(slot)
        db.session.flush()

        req = Service_Request(
            Customer_ID=cust.User_ID,
            Vehicle_ID=veh.Vehicle_ID,
            Slot_ID=slot.Slot_ID,
            center_id=c.id,
            Status="In Progress"
        )
        db.session.add(req)
        db.session.commit()

        # ELC-007 starts at 0 (Out of stock)
        part = Spare_Part.query.filter_by(center_id=c.id, sku="ELC-007").first()
        assert part.Quantity_In_Stock == 0

        with pytest.raises(ValueError) as exc:
            add_part_to_job(req.Request_ID, part.Part_ID, quantity=1)
        assert "Insufficient stock" in str(exc.value)

        # Status moved to Awaiting Parts
        db.session.refresh(req)
        assert req.Status == "Awaiting Parts"


def test_soft_delete_preserves_past_jobs(client, app):
    with app.app_context():
        user = User(
            Name="Center Owner 701",
            Email="owner701@vscms.com",
            Contact="9701000000",
            Password_Hash=hash_password("Pass@123"),
            Role="center",
            Is_Active=True
        )
        db.session.add(user)
        db.session.flush()

        center = make_center(701, "Soft Delete Center", "VSC-701", owner_user_id=user.User_ID)
        db.session.add(center)
        db.session.flush()
        user.center_id = center.id

        seed_default_parts(center.id)

        cust = User(Name="Cust 701", Email="c701@test.com", Contact="9701111111", Password_Hash="x", Role="customer")
        db.session.add(cust)
        db.session.flush()

        veh = make_vehicle(cust.User_ID, "MH12AB7001")
        db.session.add(veh)
        db.session.flush()

        slot = make_slot(center.id)
        db.session.add(slot)
        db.session.flush()

        req = Service_Request(
            Customer_ID=cust.User_ID,
            Vehicle_ID=veh.Vehicle_ID,
            Slot_ID=slot.Slot_ID,
            center_id=center.id,
            Status="In Progress"
        )
        db.session.add(req)
        db.session.flush()

        part = Spare_Part.query.filter_by(center_id=center.id, sku="ENG-001").first()
        part_id = part.Part_ID

        # Add part to job
        add_part_to_job(req.Request_ID, part_id, quantity=2)
        db.session.commit()

        token = generate_jwt(user)

    # Delete the part via API
    res = client.delete(
        f'/api/center/parts/{part_id}',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["soft_deleted"] is True

    with app.app_context():
        part_db = db.session.get(Spare_Part, part_id)
        assert part_db is not None
        assert part_db.is_active is False
        # Part used entry still exists
        assert Job_Part_Used.query.filter_by(Part_ID=part_id).count() == 1


def test_register_center_auto_seeds(client, app):
    payload = {
        "owner_name": "New Owner Auto",
        "email": "auto_new_owner@test.com",
        "phone": "9811122233",
        "password": "Password@123",
        "name": "Auto Seed Workshop",
        "city": "Pune",
        "area": "Kothrud",
        "address": "45 Paud Road"
    }
    res = client.post('/api/centers/register', json=payload)
    assert res.status_code == 201
    data = res.get_json()
    new_center_id = data["center"]["id"]

    with app.app_context():
        parts = Spare_Part.query.filter_by(center_id=new_center_id).all()
        assert len(parts) == 44


def test_approve_center_auto_seeds(client, app):
    with app.app_context():
        admin = User(
            Name="Platform Admin",
            Email="platform_test@vscms.com",
            Contact="9990001111",
            Password_Hash="x",
            Role="platform_admin",
            Is_Active=True
        )
        db.session.add(admin)
        db.session.flush()

        center = make_center(801, "Pending Center", "VSC-PEN-801")
        center.approval_status = "Pending"
        db.session.add(center)
        db.session.commit()
        cid = center.id

        token = generate_jwt(admin)

    # Approve center
    res = client.post(
        f'/api/platform/centers/{cid}/approve',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200

    with app.app_context():
        parts = Spare_Part.query.filter_by(center_id=cid).all()
        assert len(parts) == 44


def test_cross_center_isolation_enforced(client, app):
    with app.app_context():
        u1 = User(Name="Owner 1", Email="o1@test.com", Contact="9111111112", Password_Hash="x", Role="center")
        u2 = User(Name="Owner 2", Email="o2@test.com", Contact="9111111113", Password_Hash="x", Role="center")
        db.session.add_all([u1, u2])
        db.session.flush()

        c1 = make_center(901, "Center 1", owner_user_id=u1.User_ID)
        c2 = make_center(902, "Center 2", owner_user_id=u2.User_ID)
        db.session.add_all([c1, c2])
        db.session.flush()

        u1.center_id = c1.id
        u2.center_id = c2.id
        db.session.commit()

        seed_default_parts(c1.id)
        seed_default_parts(c2.id)

        part_c2 = Spare_Part.query.filter_by(center_id=c2.id, sku="BRK-001").first()
        part_c2_id = part_c2.Part_ID

        token1 = generate_jwt(u1)

    # Owner 1 tries to adjust Owner 2's part -> 404 (not found in caller's center) or 403
    res = client.post(
        f'/api/center/parts/{part_c2_id}/adjust',
        headers={"Authorization": f"Bearer {token1}"},
        json={"delta": 10, "reason": "Hacking stock"}
    )
    assert res.status_code in (403, 404)


def test_inventory_report_json_and_csv_export(client, app):
    with app.app_context():
        u = User(Name="Admin Rep", Email="rep_admin@test.com", Contact="9111111999", Password_Hash="x", Role="admin")
        db.session.add(u)
        db.session.flush()

        center = make_center(950, "Reports Workshop", "VSC-REP-950", owner_user_id=u.User_ID)
        db.session.add(center)
        db.session.flush()

        u.center_id = center.id
        db.session.commit()

        seed_default_parts(center.id)
        token = generate_jwt(u)

    # 1. Test JSON report
    res = client.get('/api/reports/inventory', headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "summary" in data
    assert data["summary"]["total_parts_catalog"] == 44
    assert data["summary"]["total_valuation"] > 0
    assert data["summary"]["low_stock_count"] == 3
    assert data["summary"]["out_of_stock_count"] == 1
    assert len(data["out_of_stock_parts"]) == 1
    assert data["out_of_stock_parts"][0]["sku"] == "ELC-007"
    assert len(data["low_stock_parts"]) == 3

    # 2. Test CSV export
    res_csv = client.get('/api/reports/inventory?export=csv', headers={"Authorization": f"Bearer {token}"})
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.content_type
    csv_text = res_csv.data.decode('utf-8')
    assert "SKU,Part Name,Category,Unit,Unit Price (INR)" in csv_text
    assert "ELC-007" in csv_text
    assert "ENG-001" in csv_text
    assert "Engine & Oils" in csv_text
    assert "Out of stock" in csv_text


