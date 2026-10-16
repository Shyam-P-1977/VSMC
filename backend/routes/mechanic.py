from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required
from models import Service_Request, Mechanic, User, Job_Labour, Status_History, Invoice, Spare_Part
from services.inventory_service import add_part_to_job, remove_part_from_job
from services.billing_service import calculate_and_create_invoice
from services.notification_service import notify_user
from services.tenancy import get_current_center_id, get_or_404_in_center
from data.service_parts_mapping import get_suggested_skus_for_services

mechanic_bp = Blueprint('mechanic', __name__, url_prefix='/api')

LEGAL_TRANSITIONS = {
    'Assigned': ['In Progress', 'Cancelled'],
    'In Progress': ['Awaiting Parts', 'Completed'],
    'Awaiting Parts': ['In Progress', 'Completed']
}

def verify_and_fetch_request(request_id, user):
    """
    Safely retrieves a request with strict multi-tenant isolation:
    - If user is platform_admin: fetches directly, or 404.
    - If user is center/admin: fetches only if belongs to user's center (404 otherwise).
    - If user is mechanic: fetches only if belongs to mechanic's center (404 otherwise),
      and verifies mechanic is assigned to the request (403 otherwise).
    Returns (req, error_response, status_code).
    """
    if user.Role == 'platform_admin':
        req = db.session.get(Service_Request, request_id)
        if not req:
            return None, jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404
        return req, None, 200

    center_id = get_current_center_id(user)
    if not center_id:
        return None, jsonify({"error": "Forbidden: No center association", "code": "FORBIDDEN"}), 403

    try:
        req = get_or_404_in_center(Service_Request, request_id, center_id)
    except Exception:
        return None, jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if user.Role == 'mechanic':
        mech_profile = getattr(user, 'mechanic_profile', None)
        if not mech_profile or req.Mechanic_ID != mech_profile.Mechanic_ID:
            return None, jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

    return req, None, 200


@mechanic_bp.route('/admin/mechanics/available', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_available_mechanics():
    """
    Returns active mechanics who are available for job assignment,
    strictly scoped to the current user's center.
    """
    user = request.current_user
    query = Mechanic.query.join(User).filter(
        User.Is_Active == True,
        Mechanic.Is_Available == True
    )
    if user.Role in ['admin', 'center']:
        center_id = get_current_center_id(user)
        query = query.filter(Mechanic.center_id == center_id)
    elif user.Role == 'platform_admin':
        target_center = request.args.get('center_id', type=int)
        if target_center:
            query = query.filter(Mechanic.center_id == target_center)

    mechanics = query.all()
    return jsonify({"mechanics": [m.to_dict() for m in mechanics]}), 200


@mechanic_bp.route('/requests/<int:request_id>/assign', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def assign_mechanic(request_id):
    """
    Center manager assigns an active, available mechanic to a service request.
    Strictly scoped to caller's center.
    """
    user = request.current_user
    if user.Role == 'platform_admin':
        req = db.session.get(Service_Request, request_id)
        if not req:
            return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404
    else:
        center_id = get_current_center_id(user)
        try:
            req = get_or_404_in_center(Service_Request, request_id, center_id)
        except Exception:
            return jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

    if req.Status in ['Completed', 'Cancelled']:
        return jsonify({"error": f"Cannot assign mechanic to a {req.Status} request", "code": "INVALID_STATE"}), 400

    data = request.get_json() or {}
    mechanic_id = data.get('mechanic_id')
    if not mechanic_id:
        return jsonify({"error": "Mechanic ID is required", "code": "VALIDATION_ERROR"}), 400

    if user.Role == 'platform_admin':
        mechanic = db.session.get(Mechanic, mechanic_id)
    else:
        try:
            mechanic = get_or_404_in_center(Mechanic, mechanic_id, center_id)
        except Exception:
            return jsonify({"error": "Mechanic not found", "code": "NOT_FOUND"}), 404

    if not mechanic:
        return jsonify({"error": "Mechanic not found", "code": "NOT_FOUND"}), 404

    if not mechanic.user or not mechanic.user.Is_Active or not mechanic.Is_Active:
        return jsonify({"error": "Cannot assign a deactivated mechanic", "code": "MECHANIC_INACTIVE"}), 400

    # Cross-center check: mechanic must belong to the same center
    if req.center_id and mechanic.center_id and req.center_id != mechanic.center_id:
        return jsonify({
            "error": "Forbidden: Mechanic belongs to another center",
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
    req, err, status_code = verify_and_fetch_request(request_id, user)
    if err:
        return err, status_code

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


@mechanic_bp.route('/jobs/<int:request_id>/parts-options', methods=['GET'])
@mechanic_bp.route('/requests/<int:request_id>/parts-options', methods=['GET'])
@mechanic_bp.route('/mechanic/jobs/<int:request_id>/parts-options', methods=['GET'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/parts-options', methods=['GET'])
@token_required
def get_job_parts_options(request_id):
    """
    Returns active parts for the request's center, grouped by category,
    plus suggested parts based on the job's requested services.
    Enforces center isolation.
    """
    user = request.current_user
    req, err, status_code = verify_and_fetch_request(request_id, user)
    if err:
        return err, status_code

    center_id = req.center_id
    if not center_id:
        return jsonify({"suggested_parts": [], "categories": {}, "parts": []}), 200

    # Fetch active parts for this center only
    parts = Spare_Part.query.filter_by(center_id=center_id, is_active=True).order_by(Spare_Part.Name.asc()).all()
    parts_data = [p.to_dict() for p in parts]
    parts_by_sku = {p.sku: p.to_dict() for p in parts if p.sku}

    # Extract services from service items
    service_names = []
    if req.service_items:
        for item in req.service_items:
            if item.service and item.service.Name:
                service_names.append(item.service.Name)
            elif item.custom_service_name:
                service_names.append(item.custom_service_name)

    suggested_skus = get_suggested_skus_for_services(service_names)
    suggested_parts = []
    for sku in suggested_skus:
        if sku in parts_by_sku:
            suggested_parts.append(parts_by_sku[sku])

    # Group parts by category
    categories = {}
    for p in parts_data:
        cat = p.get('category') or 'General'
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)

    return jsonify({
        "request_id": request_id,
        "center_id": center_id,
        "services": service_names,
        "suggested_parts": suggested_parts,
        "categories": categories,
        "parts": parts_data
    }), 200


@mechanic_bp.route('/requests/<int:request_id>/parts', methods=['POST'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/parts', methods=['POST'])
@token_required
def log_part(request_id):
    user = request.current_user
    req, err, status_code = verify_and_fetch_request(request_id, user)
    if err:
        return err, status_code

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
    except PermissionError as e:
        return jsonify({"error": str(e), "code": "FORBIDDEN"}), 403
    except ValueError as e:
        return jsonify({"error": str(e), "code": "INSUFFICIENT_STOCK"}), 400
    except LookupError as e:
        return jsonify({"error": str(e), "code": "NOT_FOUND"}), 404


@mechanic_bp.route('/requests/<int:request_id>/parts/<int:part_used_id>', methods=['DELETE'])
@mechanic_bp.route('/mechanic/requests/<int:request_id>/parts/<int:part_used_id>', methods=['DELETE'])
@token_required
def remove_part(request_id, part_used_id):
    user = request.current_user
    req, err, status_code = verify_and_fetch_request(request_id, user)
    if err:
        return err, status_code

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
    req, err, status_code = verify_and_fetch_request(request_id, user)
    if err:
        return err, status_code

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
    req, err, status_code = verify_and_fetch_request(request_id, user)
    if err:
        return err, status_code

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
