import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import TestConfig  # noqa: E402
from extensions import db  # noqa: E402
from factory import create_app  # noqa: E402
from models import Mechanic, Service, SparePart, User  # noqa: E402


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        def mk(name, email, contact, role, pw):
            u = User(name=name, email=email, contact=contact, role=role)
            u.set_password(pw)
            db.session.add(u)
            return u
        mk("Admin", "admin@t.com", "9000000000", "admin", "Admin@123")
        for i in (1, 2):
            u = mk(f"Mech {i}", f"mech{i}@t.com", f"900000010{i}", "mechanic", "Mech@1234")
            db.session.add(Mechanic(user=u, specialization="General", is_available=True))
        mk("Cust One", "cust1@t.com", "9000000201", "customer", "Cust@1234")
        mk("Cust Two", "cust2@t.com", "9000000202", "customer", "Cust@1234")
        db.session.add(Service(name="Oil Change", description="x", base_price=1000, estimated_hours=1))
        db.session.add(Service(name="Brake Repair", description="x", base_price=2000, estimated_hours=2))
        db.session.add(SparePart(name="Oil Filter", price=100, quantity_in_stock=5, min_threshold=5))
        db.session.add(SparePart(name="Brake Pad", price=500, quantity_in_stock=50, min_threshold=5))
        db.session.commit()
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, email, pw):
    r = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.get_json()
    return {"Authorization": f"Bearer {r.get_json()['token']}"}


@pytest.fixture()
def admin_h(client):
    return login(client, "admin@t.com", "Admin@123")


@pytest.fixture()
def cust_h(client):
    return login(client, "cust1@t.com", "Cust@1234")


@pytest.fixture()
def cust2_h(client):
    return login(client, "cust2@t.com", "Cust@1234")


@pytest.fixture()
def mech1_h(client):
    return login(client, "mech1@t.com", "Mech@1234")


@pytest.fixture()
def mech2_h(client):
    return login(client, "mech2@t.com", "Mech@1234")
