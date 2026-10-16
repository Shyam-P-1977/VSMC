import os
from flask import Flask, jsonify
from config import Config
from extensions import db, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]}},
        supports_credentials=True
    )

    # Ensure uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Vehicle Service Center Management System (VSCMS)",
            "version": "1.0.0"
        }), 200

    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.vehicle import vehicle_bp
    from routes.catalog import catalog_bp
    from routes.request import request_bp
    from routes.mechanic import mechanic_bp
    from routes.inventory import inventory_bp
    from routes.billing import billing_bp
    from routes.payment import payment_bp
    from routes.notification import notification_bp
    from routes.report import report_bp
    from routes.admin import admin_bp
    from routes.contact import contact_bp
    from routes.center_admin import center_bp
    from routes.platform import platform_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(vehicle_bp)
    app.register_blueprint(catalog_bp)
    app.register_blueprint(request_bp)
    app.register_blueprint(mechanic_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(billing_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(center_bp)
    app.register_blueprint(platform_bp)

    # Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": getattr(e, 'description', "Bad request"), "code": "BAD_REQUEST"}), 400

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": getattr(e, 'description', "Forbidden"), "code": "FORBIDDEN"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Requested resource not found", "code": "NOT_FOUND"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "HTTP method not allowed for this endpoint", "code": "METHOD_NOT_ALLOWED"}), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "code": "INTERNAL_SERVER_ERROR"}), 500

    with app.app_context():
        import models  # noqa: F401
        db.create_all()

        # One-time backfill on app startup:
        # For every existing center that has ZERO parts, seed default parts catalog
        try:
            from models import Service_Center, Spare_Part
            from services.inventory_service import seed_default_parts
            centers = Service_Center.query.all()
            for c in centers:
                part_count = Spare_Part.query.filter_by(center_id=c.id).count()
                if part_count == 0:
                    res = seed_default_parts(c.id)
                    print(f"[*] Backfilled {res['added']} default spare parts for center #{c.id} ({c.name} - {c.center_code})")
        except Exception as e:
            print("[!] Startup inventory backfill error:", e)

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
