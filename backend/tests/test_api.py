from datetime import date, timedelta

import pytest

from conftest import login


def tomorrow(n=1):
    return (date.today() + timedelta(days=n)).isoformat()


def add_vehicle(client, h, reg="MH12AB1234"):
    r = client.post("/api/vehicles", json={"registration_number": reg, "make": "Maruti", "model": "Swift",
                                           "year": 2020}, headers=h)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def get_slot(client, h, day=1, idx=0):
    return client.get(f"/api/slots?date={tomorrow(day)}", headers=h).get_json()["items"][idx]


def book(client, h, vehicle_id, slot_id, services=(1,)):
    return client.post("/api/requests", json={"vehicle_id": vehicle_id, "service_ids": list(services),
                                              "slot_id": slot_id, "problem_description": "Strange noise"},
                       headers=h)


def mech_id(client, h, n=1):
    items = client.get("/api/admin/mechanics/available", headers=h).get_json()["items"]
    return [m for m in items if m["email"] == f"mech{n}@t.com"][0]["id"]


def assigned_job(client, cust_h, admin_h, mech_h, n=1, reg="MH12AB1234", day=1, idx=0):
    v = add_vehicle(client, cust_h, reg)
    rid = book(client, cust_h, v["id"], get_slot(client, cust_h, day, idx)["id"]).get_json()["id"]
    r = client.post(f"/api/requests/{rid}/assign", json={"mechanic_id": mech_id(client, admin_h, n)},
                    headers=admin_h)
    assert r.status_code == 200, r.get_json()
    return rid


def in_progress_job(client, cust_h, admin_h, mech_h, **kw):
    rid = assigned_job(client, cust_h, admin_h, mech_h, **kw)
    r = client.put(f"/api/requests/{rid}/status", json={"status": "In Progress"}, headers=mech_h)
    assert r.status_code == 200, r.get_json()
    return rid


def parts_by_name(client, h):
    return {p["name"]: p for p in client.get("/api/parts", headers=h).get_json()["items"]}


# ---------------------------------------------------------------------------------
def test_duplicate_email_and_generic_login(client):
    body = {"name": "New User", "email": "cust1@t.com", "contact": "9111111111", "password": "Password1"}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 409 and r.get_json()["code"] == "duplicate_email"
    body.update(email="new@t.com", contact="9000000201")
    assert client.post("/api/auth/register", json=body).status_code == 409
    body.update(contact="9111111111", password="short")
    assert client.post("/api/auth/register", json=body).status_code == 422
    # BR-5: identical error whichever field is wrong
    a = client.post("/api/auth/login", json={"email": "nobody@t.com", "password": "x"})
    b = client.post("/api/auth/login", json={"email": "cust1@t.com", "password": "wrongpass"})
    assert a.status_code == b.status_code == 401
    assert a.get_json()["error"] == b.get_json()["error"] == "Invalid email or password"


def test_duplicate_vehicle_across_customers(client, cust_h, cust2_h):
    add_vehicle(client, cust_h, "MH12AB1234")
    r = client.post("/api/vehicles", json={"registration_number": "mh 12-ab 1234", "make": "A", "model": "B",
                                           "year": 2019}, headers=cust2_h)
    assert r.status_code == 409 and r.get_json()["code"] == "duplicate_vehicle"
    r = client.post("/api/vehicles", json={"registration_number": "BAD", "make": "A", "model": "B",
                                           "year": 2019}, headers=cust2_h)
    assert r.status_code == 422


def test_overbooking_prevented_with_alternates(client, cust_h, cust2_h, admin_h):
    slot = get_slot(client, admin_h)
    assert client.put(f"/api/slots/{slot['id']}", json={"capacity": 1}, headers=admin_h).status_code == 200
    v1 = add_vehicle(client, cust_h, "MH12AB1234")
    v2 = add_vehicle(client, cust2_h, "MH14CD5678")
    assert book(client, cust_h, v1["id"], slot["id"]).status_code == 201
    r = book(client, cust2_h, v2["id"], slot["id"])
    assert r.status_code == 409
    body = r.get_json()
    assert body["code"] == "slot_unavailable" and 1 <= len(body["alternates"]) <= 3
    assert all(a["id"] != slot["id"] and a["is_available"] for a in body["alternates"])
    assert get_slot(client, admin_h)["booked_count"] == 1


def test_cancel_frees_slot_and_rules(client, cust_h, admin_h, mech1_h):
    v = add_vehicle(client, cust_h)
    slot = get_slot(client, cust_h)
    rid = book(client, cust_h, v["id"], slot["id"]).get_json()["id"]
    assert get_slot(client, cust_h)["booked_count"] == 1
    assert client.post(f"/api/requests/{rid}/cancel", headers=cust_h).status_code == 200
    assert get_slot(client, cust_h)["booked_count"] == 0
    rid2 = in_progress_job(client, cust_h, admin_h, mech1_h, reg="MH14CD5678", day=2)
    r = client.post(f"/api/requests/{rid2}/cancel", headers=cust_h)
    assert r.status_code == 409


def test_only_admin_assigns_and_only_available_mechanic(client, cust_h, admin_h, mech1_h):
    v = add_vehicle(client, cust_h)
    rid = book(client, cust_h, v["id"], get_slot(client, cust_h)["id"]).get_json()["id"]
    assert client.post(f"/api/requests/{rid}/assign", json={"mechanic_id": 1}, headers=mech1_h).status_code == 403
    assert client.post(f"/api/requests/{rid}/assign", json={"mechanic_id": 1}, headers=cust_h).status_code == 403
    assert client.post(f"/api/requests/{rid}/assign", json={"mechanic_id": 1}, headers=admin_h).status_code == 200
    v2 = add_vehicle(client, cust_h, "MH14CD5678")
    rid2 = book(client, cust_h, v2["id"], get_slot(client, cust_h, 1, 1)["id"]).get_json()["id"]
    r = client.post(f"/api/requests/{rid2}/assign", json={"mechanic_id": 1}, headers=admin_h)  # busy now
    assert r.status_code == 409 and r.get_json()["code"] == "mechanic_unavailable"
    # BR-17: cannot deactivate a mechanic with active jobs
    r = client.put("/api/admin/mechanics/1", json={"is_active": False}, headers=admin_h)
    assert r.status_code == 409


def test_illegal_status_transition(client, cust_h, admin_h, mech1_h):
    rid = assigned_job(client, cust_h, admin_h, mech1_h)
    for bad in ("Completed", "Awaiting Parts", "Pending", "Cancelled"):
        r = client.put(f"/api/requests/{rid}/status", json={"status": bad}, headers=mech1_h)
        assert r.status_code in (409, 422), bad
    assert client.put(f"/api/requests/{rid}/status", json={"status": "In Progress"}, headers=mech1_h).status_code == 200
    assert client.put(f"/api/requests/{rid}/status", json={"status": "Awaiting Parts"}, headers=mech1_h).status_code == 200
    assert client.put(f"/api/requests/{rid}/status", json={"status": "In Progress"}, headers=mech1_h).status_code == 200
    tl = client.get(f"/api/requests/{rid}", headers=cust_h).get_json()["timeline"]
    assert [t["status"] for t in tl] == ["Pending", "Assigned", "In Progress", "Awaiting Parts", "In Progress"]


def test_mechanic_access_isolation(client, cust_h, cust2_h, admin_h, mech1_h, mech2_h):
    rid = assigned_job(client, cust_h, admin_h, mech1_h, n=1)
    assert client.get(f"/api/requests/{rid}", headers=mech2_h).status_code == 403
    assert client.put(f"/api/requests/{rid}/status", json={"status": "In Progress"}, headers=mech2_h).status_code == 403
    assert client.post(f"/api/requests/{rid}/parts", json={"part_id": 2, "quantity": 1}, headers=mech2_h).status_code == 403
    assert client.post(f"/api/requests/{rid}/complete", headers=mech2_h).status_code == 403
    assert client.get("/api/requests", headers=mech2_h).get_json()["total"] == 0
    assert client.get("/api/requests", headers=mech1_h).get_json()["total"] == 1
    # customers are isolated too
    assert client.get(f"/api/requests/{rid}", headers=cust2_h).status_code == 403
    assert client.get("/api/requests", headers=cust2_h).get_json()["total"] == 0
    assert client.get("/api/admin/customers", headers=cust_h).status_code == 403


def test_stock_deduction_and_insufficient_stock(client, cust_h, admin_h, mech1_h):
    rid = in_progress_job(client, cust_h, admin_h, mech1_h)
    parts = parts_by_name(client, admin_h)
    brake, oil = parts["Brake Pad"], parts["Oil Filter"]
    r = client.post(f"/api/requests/{rid}/parts", json={"part_id": brake["id"], "quantity": 4}, headers=mech1_h)
    assert r.status_code == 201
    assert parts_by_name(client, admin_h)["Brake Pad"]["quantity_in_stock"] == 46
    # update + remove restore stock correctly
    jid = r.get_json()["part_used"]["id"]
    assert client.put(f"/api/requests/{rid}/parts/{jid}", json={"quantity": 2}, headers=mech1_h).status_code == 200
    assert parts_by_name(client, admin_h)["Brake Pad"]["quantity_in_stock"] == 48
    assert client.delete(f"/api/requests/{rid}/parts/{jid}", headers=mech1_h).status_code == 200
    assert parts_by_name(client, admin_h)["Brake Pad"]["quantity_in_stock"] == 50
    # deduction below threshold -> low-stock alert to admin
    assert client.post(f"/api/requests/{rid}/parts", json={"part_id": oil["id"], "quantity": 1}, headers=mech1_h).status_code == 201
    notes = client.get("/api/notifications", headers=admin_h).get_json()["items"]
    assert any("Low stock alert: Oil Filter" in n["message"] for n in notes)
    # insufficient stock -> rejected, Awaiting Parts, admin notified, stock untouched
    r = client.post(f"/api/requests/{rid}/parts", json={"part_id": oil["id"], "quantity": 99}, headers=mech1_h)
    assert r.status_code == 409 and r.get_json()["error"] == "Insufficient stock"
    assert client.get(f"/api/requests/{rid}", headers=mech1_h).get_json()["status"] == "Awaiting Parts"
    assert parts_by_name(client, admin_h)["Oil Filter"]["quantity_in_stock"] == 4
    notes = client.get("/api/notifications", headers=admin_h).get_json()["items"]
    assert any("Insufficient stock" in n["message"] for n in notes)


def test_complete_requires_details_and_calculates_invoice(client, cust_h, admin_h, mech1_h):
    rid = in_progress_job(client, cust_h, admin_h, mech1_h)
    r = client.post(f"/api/requests/{rid}/complete", json={}, headers=mech1_h)
    assert r.status_code == 422 and r.get_json()["code"] == "missing_details"
    client.post(f"/api/requests/{rid}/labour", json={"description": "Service", "hours": 2, "rate_per_hour": 500},
                headers=mech1_h)
    r = client.post(f"/api/requests/{rid}/complete", json={}, headers=mech1_h)  # parts not confirmed
    assert r.status_code == 422 and "parts" in r.get_json()["missing"]
    brake = parts_by_name(client, admin_h)["Brake Pad"]
    client.post(f"/api/requests/{rid}/parts", json={"part_id": brake["id"], "quantity": 2}, headers=mech1_h)
    r = client.post(f"/api/requests/{rid}/complete", json={}, headers=mech1_h)
    assert r.status_code == 200
    inv = r.get_json()["invoice_detail"]
    # labour 1000 + parts 1000 = 2000; GST 18% = 360; total 2360
    assert (inv["labour_charge"], inv["parts_cost"], inv["gst_amount"], inv["total_amount"]) == (1000, 1000, 360, 2360)
    assert inv["status"] == "Unpaid" and inv["invoice_number"].startswith("INV-")
    # mechanic freed, customer notified
    assert client.get("/api/admin/mechanics/available", headers=admin_h).get_json()["total"] == 2
    notes = client.get("/api/notifications", headers=cust_h).get_json()["items"]
    assert any("Invoice generated" in n["message"] for n in notes)
    # discount recalculation on unpaid invoice
    r = client.put(f"/api/invoices/{inv['id']}", json={"discount": 60}, headers=admin_h)
    assert r.status_code == 200 and r.get_json()["total_amount"] == 2300


def test_no_parts_confirmation_allows_completion(client, cust_h, admin_h, mech1_h):
    rid = in_progress_job(client, cust_h, admin_h, mech1_h)
    client.post(f"/api/requests/{rid}/labour", json={"description": "Wash", "hours": 1, "rate_per_hour": 400},
                headers=mech1_h)
    r = client.post(f"/api/requests/{rid}/complete", json={"no_parts_confirmed": True}, headers=mech1_h)
    assert r.status_code == 200 and r.get_json()["invoice_detail"]["total_amount"] == 472


def _completed_invoice(client, cust_h, admin_h, mech1_h):
    rid = in_progress_job(client, cust_h, admin_h, mech1_h)
    client.post(f"/api/requests/{rid}/labour", json={"description": "Svc", "hours": 2, "rate_per_hour": 500},
                headers=mech1_h)
    r = client.post(f"/api/requests/{rid}/complete", json={"no_parts_confirmed": True}, headers=mech1_h)
    return rid, r.get_json()["invoice_detail"]


def test_paid_invoice_immutability_and_manual_payment(client, cust_h, admin_h, mech1_h):
    rid, inv = _completed_invoice(client, cust_h, admin_h, mech1_h)
    r = client.post(f"/api/invoices/{inv['id']}/mark-paid", json={"method": "Cash"}, headers=admin_h)
    assert r.status_code == 200 and r.get_json()["invoice"]["status"] == "Paid"
    assert client.post(f"/api/invoices/{inv['id']}/mark-paid", json={"method": "Cash"}, headers=admin_h).status_code == 409
    assert client.put(f"/api/invoices/{inv['id']}", json={"discount": 10}, headers=admin_h).status_code == 409
    assert client.delete(f"/api/invoices/{inv['id']}", headers=admin_h).status_code == 409
    assert client.delete(f"/api/requests/{rid}", headers=admin_h).status_code == 409
    r = client.post(f"/api/invoices/{inv['id']}/adjustment", json={"reason": "Goodwill refund", "amount": -100},
                    headers=admin_h)
    assert r.status_code == 201 and r.get_json()["payable_total"] == inv["total_amount"] - 100
    assert client.post(f"/api/invoices/{inv['id']}/adjustment", json={"reason": "x", "amount": -1},
                       headers=cust_h).status_code == 403
    # service history shows the paid job
    vid = client.get(f"/api/requests/{rid}", headers=cust_h).get_json()["vehicle"]["id"]
    hist = client.get(f"/api/vehicles/{vid}/history", headers=cust_h).get_json()
    assert hist["total"] == 1 and hist["items"][0]["invoice_detail"]["status"] == "Paid"


def test_payment_failure_retry_cancel_and_success(client, cust_h, cust2_h, admin_h, mech1_h):
    rid, inv = _completed_invoice(client, cust_h, admin_h, mech1_h)
    assert client.post("/api/payments/initiate", json={"invoice_id": inv["id"], "method": "Card"},
                       headers=cust2_h).status_code == 404  # not their invoice
    card = {"card_number": "4111 1111 1111 0000", "expiry": "12/40", "cvv": "123"}
    p = client.post("/api/payments/initiate", json={"invoice_id": inv["id"], "method": "Card"}, headers=cust_h)
    pid = p.get_json()["payment"]["id"]
    r = client.post("/api/payments/process", json={"payment_id": pid, "method": "Card", "details": card}, headers=cust_h)
    body = r.get_json()
    assert r.status_code == 200 and body["success"] is False and body["invoice"]["status"] == "Unpaid"
    assert body["payment"]["status"] == "Failed" and body["payment"]["failure_reason"]
    assert body["payment"]["last4"] == "0000"
    # a failed payment cannot be reprocessed; retry = new attempt, then cancel it
    assert client.post("/api/payments/process", json={"payment_id": pid, "method": "Card", "details": card},
                       headers=cust_h).status_code == 409
    pid2 = client.post("/api/payments/initiate", json={"invoice_id": inv["id"], "method": "UPI"},
                       headers=cust_h).get_json()["payment"]["id"]
    r = client.post("/api/payments/cancel", json={"payment_id": pid2}, headers=cust_h)
    assert r.status_code == 200 and r.get_json()["payment"]["status"] == "Cancelled"
    assert r.get_json()["invoice"]["status"] == "Unpaid"
    # UPI containing 'fail' is declined
    pid3 = client.post("/api/payments/initiate", json={"invoice_id": inv["id"], "method": "UPI"},
                       headers=cust_h).get_json()["payment"]["id"]
    r = client.post("/api/payments/process", json={"payment_id": pid3, "method": "UPI",
                                                   "details": {"upi_id": "fail@upi"}}, headers=cust_h)
    assert r.get_json()["success"] is False
    # validation errors
    pid4 = client.post("/api/payments/initiate", json={"invoice_id": inv["id"], "method": "Card"},
                       headers=cust_h).get_json()["payment"]["id"]
    bad = client.post("/api/payments/process", json={"payment_id": pid4, "method": "Card",
                                                     "details": {**card, "cvv": "1"}}, headers=cust_h)
    assert bad.status_code == 422
    # retry with a good card succeeds
    good = {"card_number": "4111111111111111", "expiry": "12/40", "cvv": "123"}
    r = client.post("/api/payments/process", json={"payment_id": pid4, "method": "Card", "details": good}, headers=cust_h)
    body = r.get_json()
    assert body["success"] is True and body["invoice"]["status"] == "Paid"
    assert body["payment"]["transaction_id"].startswith("TXN") and body["payment"]["last4"] == "1111"
    assert "cvv" not in str(body).lower() or "1111111111111111" not in str(body)
    rec = client.get(f"/api/payments/{pid4}/receipt", headers=cust_h)
    assert rec.status_code == 200 and rec.get_json()["payment"]["status"] == "Success"
    assert client.get(f"/api/payments/{pid}/receipt", headers=cust_h).status_code == 409
    # paying again is rejected
    assert client.post("/api/payments/initiate", json={"invoice_id": inv["id"], "method": "Card"},
                       headers=cust_h).status_code == 409
    notes = client.get("/api/notifications", headers=cust_h).get_json()["items"]
    assert any("Payment of Rs." in n["message"] for n in notes)


def test_requires_auth_and_error_format(client):
    r = client.get("/api/requests")
    assert r.status_code == 401 and set(r.get_json()) >= {"error", "code"}
    assert client.get("/api/nope").status_code == 404
