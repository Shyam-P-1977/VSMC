from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required
from models import Service_Request, Mechanic, User, Job_Labour, Status_History, Invoice
from services.inventory_service import add_part_to_job, remove_part_from_job
from services.billing_service import calculate_and_create_invoice
from services.notification_service import notify_user

mechanic_bp = Blueprint('mechanic', __name__, url_prefix='/api')

LEGAL_TRANSITIONS = {
    'Assigned': ['In Progress', 'Cancelled'],
    'In Progress': ['Awaiting Parts', 'Completed'],
    'Awaiting Parts': ['In Progress', 'Completed']
}

def verify_mechanic_assignment(req, user):
    """
    Ensures that if the user is a mechanic, they are assigned to this request
    and belong to the same center. Admin/Center is allowed for their own center.
    """
    if user.Role in ['admin', 'center', 'platform_admin']:
        if user.Role == 'platform_admin':
            return True
        target_center = user.center_id or (user.owned_center.id if user.owned_center else None)
        if target_center and req.center_id and target_center != req.center_id:
            return False
        return True
    if user.Role == 'mechanic':
        if not user.mechanic_profile or req.Mechanic_ID != user.mechanic_profile.Mechanic_ID:
            return False
        if req.center_id and user.mechanic_profile.center_id and req.center_id != user.mechanic_profile.center_id:
            return False
        return True
    return False

@mechanic_bp.route('/admin/mechanics/available', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_available_mechanics():
    """
    Returns active mechanics who are available for job assignment,
    scoped to the current user's center.
    """
    user = request.current_user
    query = Mechanic.query.join(User).filter(
        User.Is_Active == True,
        Mechanic.Is_Active == True
    )
    if user.Role in ['admin', 'center']:
        target_center = user.center_id or (user.owned_center.id if user.owned_center else None)
        if target_center:
            query = query.filter(Mechanic.center_id == target_center)

    mechanics = query.all()
    return jsonify({"mechanics": [m.to_dict() for m in mechanics]}), 200

@mechanic_bp.route('/requests/<int:request_id>/assign', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def assign_mechanic(request_id):
    """
    Center manager assigns an active, available mechanic to a service request.
    Mechanic must belong to the same service center.
    """
    req = db.session.get(Service_Request, request_id)
    if not req:
        return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if req.Status in ['Completed', 'Cancelled']:
        return jsonify({"error": f"Cannot assign mechanic to a {req.Status} request", "code": "INVALID_STATE"}), 400

    data = request.get_json() or {}
    mechanic_id = data.get('mechanic_id')
    if not mechanic_id:
        return jsonify({"error": "Mechanic ID is required", "code": "VALIDATION_ERROR"}), 400

    mechanic = db.session.get(Mechanic, mechanic_id)
    if not mechanic:
        return jsonify({"error": "Mechanic not found", "code": "NOT_FOUND"}), 404

    if not mechanic.user or not mechanic.user.Is_Active or not mechanic.Is_Active:
        return jsonify({"error": "Cannot assign a deactivated mechanic", "code": "MECHANIC_INACTIVE"}), 400

    # Cross-center check: mechanic must belong to the same center
    if req.center_id and mechanic.center_id and req.center_id != mechanic.center_id:
        return jsonify({
            "error": f"Forbidden: Mechanic belongs to Center #{mechanic.center_id}, but request is for Center #{req.center_id}",
            "code": "CROSS_CENTER_ASSIGNMENT_FORBIDDEN"
        }), 403

    req.Mechanic_ID = mechanic.Mechanic_ID
    req.Status = 'Assigned'

    history = Status_History(
        Request_ID=req.Request_ID,
        Status='Assigned',
        Changed_By=request.current_user.User_ID,
        Note=f"Assigned to mechanic {mechanic.user.Name}"
    )
    db.session.add(history)

    # Notify mechanic and customer
    notify_user(mechanic.user.User_ID, f"New job assigned: Request #{req.Request_ID} ({req.vehicle.Make} {req.vehicle.Model}).")
    notify_user(req.Customer_ID, f"Mechanic {mechanic.user.Name} has been assigned to your vehicle service.")

    db.session.commit()
    return jsonify({
        "message": "Mechanic assigned successfully",
        "request": req.to_dict()
    }), 200

@mechanic_bp.route('/requests/<int:request_id>/status', methods=['PUT'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/status', methods=['PUT'])
@token_required
def update_status(request_id):
    """
    Mechanic updates the job status following strict legal state transitions.
    """
    user = request.current_user
    req = db.session.get(Service_Request, request_id)
    if not req:
        return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if not verify_mechanic_assignment(req, user):
        return jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    next_status = data.get('status')
    note = data.get('note', '')

    current_status = req.Status
    allowed = LEGAL_TRANSITIONS.get(current_status, [])

    if next_status not in allowed:
        return jsonify({
            "error": f"Illegal status transition from '{current_status}' to '{next_status}'. Allowed transitions: {allowed}",
            "code": "ILLEGAL_STATUS_TRANSITION"
        }), 400

    req.Status = next_status
    history = Status_History(
        Request_ID=req.Request_ID,
        Status=next_status,
        Changed_By=user.User_ID,
        Note=note or f"Status changed to {next_status}"
    )
    db.session.add(history)

    notify_user(req.Customer_ID, f"Your vehicle service status is now: {next_status}. {note}")

    db.session.commit()
    return jsonify({
        "message": f"Status updated to {next_status}",
        "request": req.to_dict()
    }), 200

@mechanic_bp.route('/requests/<int:request_id>/parts', methods=['POST'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/parts', methods=['POST'])
@token_required
def log_part(request_id):
    user = request.current_user
    req = db.session.get(Service_Request, request_id)
    if not req:
        return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if not verify_mechanic_assignment(req, user):
        return jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    part_id = data.get('part_id')
    quantity = data.get('quantity', 1)

    try:
        job_part = add_part_to_job(request_id, part_id, int(quantity), user.User_ID)
        return jsonify({
            "message": "Part added to job successfully",
            "part_used": job_part.to_dict(),
            "request": req.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e), "code": "INSUFFICIENT_STOCK"}), 400
    except LookupError as e:
        return jsonify({"error": str(e), "code": "NOT_FOUND"}), 404

@mechanic_bp.route('/requests/<int:request_id>/parts/<int:part_used_id>', methods=['DELETE'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/parts/<int:part_used_id>', methods=['DELETE'])
@token_required
def remove_part(request_id, part_used_id):
    user = request.current_user
    req = db.session.get(Service_Request, request_id)
    if not req:
        return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if not verify_mechanic_assignment(req, user):
        return jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

    try:
        remove_part_from_job(request_id, part_used_id)
        return jsonify({
            "message": "Part removed from job and stock replenished",
            "request": req.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e), "code": "ERROR"}), 400

@mechanic_bp.route('/requests/<int:request_id>/labour', methods=['POST'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/labour', methods=['POST'])
@token_required
def log_labour(request_id):
    user = request.current_user
    req = db.session.get(Service_Request, request_id)
    if not req:
        return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if not verify_mechanic_assignment(req, user):
        return jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

    if req.Status in ['Completed', 'Cancelled']:
        return jsonify({"error": f"Cannot modify labour for a {req.Status} request", "code": "INVALID_STATE"}), 400

    data = request.get_json() or {}
    description = data.get('description', '').strip()
    hours = data.get('hours')
    rate_per_hour = data.get('rate_per_hour', 500.0)
    repair_notes = data.get('repair_notes', '').strip()

    if not description or hours is None:
        return jsonify({"error": "Labour description and hours are required", "code": "VALIDATION_ERROR"}), 400

    labour = Job_Labour(
        Request_ID=req.Request_ID,
        Description=description,
        Hours=float(hours),
        Rate_Per_Hour=float(rate_per_hour),
        Repair_Notes=repair_notes
    )
    db.session.add(labour)
    db.session.commit()

    return jsonify({
        "message": "Labour entry logged successfully",
        "labour": labour.to_dict(),
        "request": req.to_dict()
    }), 201

@mechanic_bp.route('/requests/<int:request_id>/complete', methods=['POST'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/complete', methods=['POST'])
@token_required
def complete_job(request_id):
    """
    Completes job:
    Requires:
    1. At least one labour entry
    2. Recorded parts OR explicit no_parts_used: true
    Frees mechanic, generates itemized invoice, transitions to Completed.
    """
    user = request.current_user
    req = db.session.get(Service_Request, request_id)
    if not req:
        return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if not verify_mechanic_assignment(req, user):
        return jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

    if req.Status == 'Completed':
        return jsonify({"error": "Job is already completed", "code": "ALREADY_COMPLETED"}), 400

    data = request.get_json() or {}
    no_parts_used = data.get('no_parts_used', False)

    # Validation: at least one labour entry
    if not req.labour_entries or len(req.labour_entries) == 0:
        return jsonify({
            "error": "A job cannot be completed without at least one labour entry logged.",
            "code": "MISSING_LABOUR"
        }), 400

    # Validation: parts recorded OR explicit no_parts_used
    if not no_parts_used and (not req.parts_used or len(req.parts_used) == 0):
        return jsonify({
            "error": "A job cannot be completed without recorded parts or an explicit confirmation of 'No parts used'.",
            "code": "MISSING_PARTS_CONFIRMATION"
        }), 400

    req.Status = 'Completed'
    req.Completed_At = datetime.utcnow()

    # Free mechanic
    if req.mechanic:
        req.mechanic.Is_Available = True

    history = Status_History(
        Request_ID=req.Request_ID,
        Status='Completed',
        Changed_By=user.User_ID,
        Note="Job marked as Completed by mechanic. Invoice generated."
    )
    db.session.add(history)
    db.session.commit()

    # Generate itemized invoice
    discount = float(data.get('discount', 0.0))
    invoice = calculate_and_create_invoice(req.Request_ID, discount=discount)

    return jsonify({
        "message": "Job marked as Completed and invoice generated successfully",
        "request": req.to_dict(),
        "invoice": invoice.to_dict()
    }), 200
