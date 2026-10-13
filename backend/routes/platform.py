from flask import Blueprint, request, jsonify
from extensions import db, role_required
from models import Service_Center, User, Mechanic, Service_Request, Invoice

platform_bp = Blueprint('platform', __name__, url_prefix='/api/platform')

@platform_bp.route('/stats', methods=['GET'])
@role_required('platform_admin')
def get_platform_stats():
    total_centers = Service_Center.query.count()
    pending_centers = Service_Center.query.filter_by(approval_status='Pending').count()
    approved_centers = Service_Center.query.filter_by(approval_status='Approved').count()
    
    total_customers = User.query.filter_by(Role='customer').count()
    total_mechanics = Mechanic.query.count()
    total_requests = Service_Request.query.count()
    
    paid_invoices = Invoice.query.filter_by(Status='Paid').all()
    total_revenue = sum(inv.Total_Amount for inv in paid_invoices)

    return jsonify({
        "stats": {
            "total_centers": total_centers,
            "pending_centers": pending_centers,
            "approved_centers": approved_centers,
            "total_customers": total_customers,
            "total_mechanics": total_mechanics,
            "total_requests": total_requests,
            "total_revenue": round(total_revenue, 2)
        }
    }), 200

@platform_bp.route('/centers', methods=['GET'])
@role_required('platform_admin')
def list_all_centers():
    status = request.args.get('status')
    query = Service_Center.query
    if status and status.lower() != 'all':
        query = query.filter_by(approval_status=status)

    centers = query.order_by(Service_Center.created_at.desc()).all()
    return jsonify({"centers": [c.to_dict() for c in centers]}), 200

@platform_bp.route('/centers/<int:center_id>/approve', methods=['POST'])
@role_required('platform_admin')
def approve_center(center_id):
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    center.approval_status = 'Approved'
    center.is_active = True
    db.session.commit()
    return jsonify({
        "message": f"Service center '{center.name}' has been Approved successfully.",
        "center": center.to_dict()
    }), 200

@platform_bp.route('/centers/<int:center_id>/reject', methods=['POST'])
@role_required('platform_admin')
def reject_center(center_id):
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    reason = data.get('reason', 'Application did not meet requirements')

    center.approval_status = 'Rejected'
    center.is_active = False
    db.session.commit()
    return jsonify({
        "message": f"Service center '{center.name}' application was Rejected.",
        "reason": reason,
        "center": center.to_dict()
    }), 200

@platform_bp.route('/centers/<int:center_id>/suspend', methods=['POST'])
@role_required('platform_admin')
def suspend_center(center_id):
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    center.approval_status = 'Suspended'
    center.is_active = False
    db.session.commit()
    return jsonify({
        "message": f"Service center '{center.name}' has been Suspended.",
        "center": center.to_dict()
    }), 200

@platform_bp.route('/customers', methods=['GET'])
@role_required('platform_admin')
def list_customers():
    customers = User.query.filter_by(Role='customer').order_by(User.Created_At.desc()).all()
    return jsonify({"customers": [c.to_dict() for c in customers]}), 200

@platform_bp.route('/bookings', methods=['GET'])
@role_required('platform_admin')
def list_bookings():
    bookings = Service_Request.query.order_by(Service_Request.Created_At.desc()).limit(100).all()
    return jsonify({"bookings": [b.to_dict(full=False) for b in bookings]}), 200
