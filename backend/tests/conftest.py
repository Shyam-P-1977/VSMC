import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from config import TestConfig
from extensions import db

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
