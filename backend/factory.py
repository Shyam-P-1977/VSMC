"""Application factory."""
import logging

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from config import Config
from extensions import db, jwt
from utils import ApiError


@event.listens_for(Engine, "connect")
def _sqlite_pragmas(dbapi_conn, _record):
    if dbapi_conn.__class__.__module__.startswith("sqlite3"):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s: %(message)s")

    db.init_app(app)
    jwt.init_app(app)
    origins = {app.config["FRONTEND_ORIGIN"], "http://127.0.0.1:5173", "http://localhost:5173"}
    CORS(app, resources={r"/api/*": {"origins": sorted(origins)}}, supports_credentials=False)

    import models  # noqa: F401  (register tables)
    from blueprints import (admin, auth, catalog, inventory, invoices, notifications, payments, reports,
                            requests_bp, vehicles)
    for bp in (auth.bp, vehicles.bp, catalog.catalog_bp, catalog.slots_bp, requests_bp.bp, inventory.bp,
               invoices.bp, payments.bp, notifications.bp, reports.bp, admin.bp):
        app.register_blueprint(bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    import os
    from flask import send_from_directory
    @app.route("/uploads/<path:filename>")
    def download_file(filename):
        return send_from_directory(os.path.join(app.root_path, "..", "uploads"), filename)

    # ---- consistent error format ----------------------------------------------------------
    @app.errorhandler(ApiError)
    def _api_error(e):
        db.session.rollback()
        return e.to_response()

    @app.errorhandler(IntegrityError)
    def _integrity(e):
        db.session.rollback()
        return {"error": "The request conflicts with existing data", "code": "conflict"}, 409

    @app.errorhandler(404)
    def _404(e):
        return {"error": "Resource not found", "code": "not_found"}, 404

    @app.errorhandler(405)
    def _405(e):
        return {"error": "Method not allowed", "code": "method_not_allowed"}, 405

    @app.errorhandler(Exception)
    def _unexpected(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return {"error": e.description, "code": e.name.lower().replace(" ", "_")}, e.code
        db.session.rollback()
        app.logger.exception("Unhandled error")
        return {"error": "Internal server error", "code": "server_error"}, 500

    @jwt.unauthorized_loader
    def _missing(reason):
        return {"error": "Authentication required", "code": "unauthorized"}, 401

    @jwt.invalid_token_loader
    def _invalid(reason):
        return {"error": "Invalid authentication token", "code": "invalid_token"}, 401

    @jwt.expired_token_loader
    def _expired(header, payload):
        return {"error": "Session expired. Please log in again.", "code": "token_expired"}, 401

    with app.app_context():
        db.create_all()
    return app
