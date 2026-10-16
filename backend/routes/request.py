import os
import uuid
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from extensions import db, token_required, role_required
from models import Service_Request, Request_Attachment, Vehicle, User, Mechanic, Service_Center, Time_Slot
from services.booking_service import (
    create_booking, cancel_booking, accept_booking, reject_booking, assign_mechanic_to_request
)
from services.tenancy import get_current_center_id, scoped_requests, get_or_404_in_center

request_bp = Blueprint('request', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
ALLOWED_MIMES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def allowed_file(filename, mime_type):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS and mime_type in ALLOWED_MIMES

def fetch_request_or_404(request_id, user):
    """
    Fetches a Service_Request enforcing multi-tenant isolation.
    Returns (req, error_response, status_code).
    For cross-center access attempts by center/mechanic, returns 404 (not 403)
    to prevent probing existence of other centers' IDs.
    """
    if user.Role == 'platform_admin':
        req = db.session.get(Service_Request, request_id)
        if not req:
            return None, jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404
        return req, None, 200

    if user.Role in ['admin', 'center', 'mechanic']:
        center_id = get_current_center_id(user)
        try:
            req = get_or_404_in_center(Service_Request, request_id, center_id)
        except Exception:
            return None, jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404

        if user.Role == 'mechanic':
            mech_profile = getattr(user, 'mechanic_profile', None)
            if not mech_profile or req.Mechanic_ID != mech_profile.Mechanic_ID:
                return None, jsonify({"error": "Forbidden: You are not assigned to this job", "code": "FORBIDDEN"}), 403

        return req, None, 200

    if user.Role == 'customer':
        req = db.session.get(Service_Request, request_id)
        if not req or req.Customer_ID != user.User_ID:
            return None, jsonify({"error": "Service request not found", "code": "NOT_FOUND"}), 404
        return req, None, 200

    return None, jsonify({"error": "Forbidden", "code": "FORBIDDEN"}), 403


# ========================================================
# CUSTOMER / PUBLIC REQUEST CREATION & LISTING
# ========================================================

@request_bp.route('/requests', methods=['POST'])
@token_required
def book_request():
    user = request.current_user
    data = request.get_json() or {}

    vehicle_id = data.get('vehicle_id')
    slot_id = data.get('slot_id')
    center_id = data.get('center_id')
    service_ids = data.get('service_ids', [])

    if not vehicle_id or not slot_id:
        return jsonify({
            "error": "Vehicle and Time Slot are required",
            "code": "VALIDATION_ERROR"
        }), 400

    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found", "code": "NOT_FOUND"}), 404

    if user.Role not in ['admin', 'center', 'platform_admin'] and vehicle.Customer_ID != user.User_ID:
        return jsonify({"error": "Forbidden: You do not own this vehicle", "code": "FORBIDDEN"}), 403

    slot = db.session.get(Time_Slot, slot_id)
    if not slot:
        return jsonify({"error": "Time slot not found", "code": "NOT_FOUND"}), 404

    if not center_id and not slot.center_id:
        return jsonify({"error": "Service center is required for booking", "code": "VALIDATION_ERROR"}), 400
    effective_center_id = center_id or slot.center_id
    if slot.center_id and center_id and slot.center_id != center_id:
        return jsonify({"error": "Selected slot belongs to a different service center", "code": "VALIDATION_ERROR"}), 400

    center = db.session.get(Service_Center, effective_center_id)
    if not center or (center.approval_status != 'Approved' or not center.is_active):
        return jsonify({"error": "Selected service center is not available", "code": "CENTER_UNAVAILABLE"}), 400

    try:
        req = create_booking(
            customer_id=vehicle.Customer_ID,
            vehicle_id=vehicle.Vehicle_ID,
            slot_id=slot_id,
            service_ids=service_ids,
            problem_data=data,
            center_id=effective_center_id
        )
        return jsonify({
            "message": "Appointment request submitted successfully. Awaiting service center approval.",
            "request": req.to_dict()
        }), 201
    except ValueError as e:
        alternates = getattr(e, 'alternates', [])
        return jsonify({
            "error": str(e),
            "code": "SLOT_FULL" if alternates else "VALIDATION_ERROR",
            "alternate_slots": alternates
        }), 409 if alternates else 400
    except Exception as e:
        return jsonify({"error": str(e), "code": "BOOKING_ERROR"}), 400

@request_bp.route('/requests', methods=['GET'])
@token_required
def list_requests():
    user = request.current_user
    status_filter = request.args.get('status')
    urgency_filter = request.args.get('urgency')
    center_id_param = request.args.get('center_id', type=int)

    if user.Role == 'customer':
        query = Service_Request.query.filter_by(Customer_ID=user.User_ID)
    elif user.Role in ['admin', 'center', 'mechanic']:
        query = scoped_requests(user=user)
    elif user.Role == 'platform_admin':
        if center_id_param:
            query = Service_Request.query.filter_by(center_id=center_id_param)
        else:
            query = Service_Request.query
    else:
        return jsonify({"requests": []}), 200

    if status_filter:
        query = query.filter(Service_Request.Status == status_filter)
    if urgency_filter:
        query = query.filter(Service_Request.Urgency == urgency_filter)

    # Order: Pending urgent first for centers, then created_at desc
    if user.Role in ['admin', 'center', 'platform_admin']:
        requests = query.order_by(
            db.case((Service_Request.Urgency == 'Urgent', 1), else_=2),
            Service_Request.Created_At.desc()
        ).all()
    else:
        requests = query.order_by(Service_Request.Created_At.desc()).all()

    return jsonify({"requests": [r.to_dict(full=False) for r in requests]}), 200

@request_bp.route('/requests/<int:request_id>', methods=['GET'])
@token_required
def get_request_detail(request_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    return jsonify({"request": req.to_dict(full=True)}), 200

@request_bp.route('/requests/<int:request_id>/cancel', methods=['POST'])
@token_required
def cancel_request_route(request_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    data = request.get_json() or {}
    note = data.get('reason', 'Cancelled by user')

    try:
        updated = cancel_booking(request_id, user.User_ID, note)
        return jsonify({
            "message": "Service booking cancelled successfully",
            "request": updated.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e), "code": "CANCEL_NOT_ALLOWED"}), 400


# ========================================================
# SERVICE CENTER WORKFLOW (Accept, Reject, Assign)
# ========================================================

@request_bp.route('/center/requests', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_center_requests():
    user = request.current_user
    status_filter = request.args.get('status')
    
    if user.Role == 'platform_admin':
        target_center = request.args.get('center_id', type=int)
        query = Service_Request.query.filter_by(center_id=target_center) if target_center else Service_Request.query
    else:
        center_id = get_current_center_id(user)
        query = scoped_requests(center_id=center_id, user=user)

    if status_filter:
        query = query.filter(Service_Request.Status == status_filter)

    requests = query.order_by(
        db.case((Service_Request.Urgency == 'Urgent', 1), else_=2),
        Service_Request.Created_At.desc()
    ).all()

    return jsonify({"requests": [r.to_dict(full=True) for r in requests]}), 200

@request_bp.route('/requests/<int:request_id>/accept', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def accept_request_route(request_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    try:
        updated = accept_booking(request_id, user.User_ID)
        return jsonify({
            "message": "Appointment request accepted successfully",
            "request": updated.to_dict(full=True)
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e), "code": "INVALID_STATE"}), 400

@request_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def reject_request_route(request_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    reason_dropdown = data.get('reason_category', '').strip()
    
    # Combine or validate reason
    full_reason = f"[{reason_dropdown}] {reason}" if reason_dropdown and reason else (reason or reason_dropdown)
    
    if len(full_reason.strip()) < 10:
        return jsonify({
            "error": "A clear rejection reason of at least 10 characters is required.",
            "code": "REASON_REQUIRED"
        }), 400

    try:
        updated = reject_booking(request_id, user.User_ID, full_reason)
        return jsonify({
            "message": "Appointment request rejected and slot released.",
            "request": updated.to_dict(full=True)
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e), "code": "INVALID_STATE"}), 400

@request_bp.route('/requests/<int:request_id>/assign', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def assign_mechanic_route(request_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    data = request.get_json() or {}
    mechanic_id = data.get('mechanic_id')
    if not mechanic_id:
        return jsonify({"error": "mechanic_id is required", "code": "VALIDATION_ERROR"}), 400

    try:
        updated = assign_mechanic_to_request(request_id, mechanic_id, user.User_ID)
        return jsonify({
            "message": "Mechanic assigned successfully",
            "request": updated.to_dict(full=True)
        }), 200
    except PermissionError as e:
        return jsonify({"error": str(e), "code": "CROSS_CENTER_ASSIGNMENT_FORBIDDEN"}), 403
    except (ValueError, LookupError) as e:
        return jsonify({"error": str(e), "code": "ASSIGN_ERROR"}), 400


# ========================================================
# ATTACHMENTS
# ========================================================

@request_bp.route('/requests/<int:request_id>/attachments', methods=['POST'])
@token_required
def upload_attachments(request_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    existing_count = Request_Attachment.query.filter_by(Request_ID=request_id).count()
    if existing_count >= 3:
        return jsonify({"error": "Maximum 3 attachments allowed per request", "code": "MAX_ATTACHMENTS_EXCEEDED"}), 400

    if 'file' not in request.files and 'images' not in request.files:
        return jsonify({"error": "No file uploaded", "code": "NO_FILE"}), 400

    uploaded_files = request.files.getlist('images') or request.files.getlist('file')
    if len(uploaded_files) + existing_count > 3:
        return jsonify({"error": f"Upload exceeds maximum 3 files limit (currently {existing_count} attached)", "code": "LIMIT_EXCEEDED"}), 400

    saved_attachments = []
    upload_dir = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_dir, exist_ok=True)

    for f in uploaded_files:
        if not f.filename:
            continue
        
        # Check size
        f.seek(0, os.SEEK_END)
        size_bytes = f.tell()
        f.seek(0)
        if size_bytes > MAX_FILE_SIZE:
            return jsonify({"error": f"File '{f.filename}' exceeds 5MB maximum size", "code": "FILE_TOO_LARGE"}), 400

        # Validate MIME and extension
        mime_type = f.content_type or 'application/octet-stream'
        if not allowed_file(f.filename, mime_type):
            return jsonify({"error": f"File '{f.filename}' has unsupported format (only JPG, PNG, WEBP allowed)", "code": "INVALID_FILE_TYPE"}), 422

        original_ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else 'jpg'
        safe_stored_name = f"{uuid.uuid4().hex}.{original_ext}"
        stored_path = os.path.join(upload_dir, safe_stored_name)
        f.save(stored_path)

        att = Request_Attachment(
            Request_ID=req.Request_ID,
            Filename=secure_filename(f.filename),
            Stored_Path=safe_stored_name,
            Mime_Type=mime_type,
            Size_Bytes=size_bytes
        )
        db.session.add(att)
        saved_attachments.append(att)

    db.session.commit()
    return jsonify({
        "message": f"{len(saved_attachments)} file(s) attached successfully",
        "attachments": [a.to_dict() for a in saved_attachments]
    }), 201

@request_bp.route('/requests/<int:request_id>/attachments/<int:attachment_id>', methods=['GET'])
@token_required
def download_attachment(request_id, attachment_id):
    user = request.current_user
    req, err, status = fetch_request_or_404(request_id, user)
    if err:
        return err, status

    att = db.session.get(Request_Attachment, attachment_id)
    if not att or att.Request_ID != request_id:
        return jsonify({"error": "Attachment not found", "code": "NOT_FOUND"}), 404

    upload_dir = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(
        upload_dir,
        att.Stored_Path,
        mimetype=att.Mime_Type,
        as_attachment=False,
        download_name=att.Filename
    )
