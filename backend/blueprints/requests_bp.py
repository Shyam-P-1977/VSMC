from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from extensions import db
from models import JobLabour, JobPartUsed, REQUEST_STATUSES, ServiceRequest, TimeSlot, User, Vehicle
from services import booking_service, inventory_service
from utils import (ApiError, current_user, get_or_404, json_body, paginate, parse_date, role_required,
                   validation_error)

bp = Blueprint("requests", __name__, url_prefix="/api/requests")


def _job_for_mechanic(rid):
    return booking_service.load_request_for(current_user(), rid)


@bp.post("")
@role_required("customer")
def book():
    d = json_body()
    req = booking_service.book(current_user(), d.get("vehicle_id"), d.get("service_ids"), d.get("slot_id"),
                               d.get("problem_description"))
    return jsonify(req.to_dict(detail=True)), 201


import os
import uuid
from werkzeug.utils import secure_filename
from models import ServiceRequestAttachment

@bp.post("/<int:rid>/attachments")
@role_required("customer", "mechanic", "admin")
def upload_attachment(rid):
    req = get_or_404(ServiceRequest, rid, "Service request")
    user = current_user()
    if user.role == "customer" and req.customer_id != user.id:
        raise validation_error("Forbidden", "forbidden")
    
    if "file" not in request.files:
        raise validation_error("No file part", "file")
    
    file = request.files["file"]
    if file.filename == "":
        raise validation_error("No selected file", "file")
        
    upload_folder = os.path.join(request.app.root_path, "..", "uploads")
    os.makedirs(upload_folder, exist_ok=True)
    
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_folder, unique_filename)
    
    file.save(file_path)
    
    att = ServiceRequestAttachment(
        request_id=req.id,
        file_name=filename,
        file_path=f"/uploads/{unique_filename}",
        file_type=file.mimetype
    )
    db.session.add(att)
    db.session.commit()
    
    return jsonify(att.to_dict()), 201


@bp.get("")
@role_required()
def list_requests():
    user = current_user()
    q = (ServiceRequest.query.join(Vehicle, ServiceRequest.vehicle_id == Vehicle.id)
         .join(User, ServiceRequest.customer_id == User.id).join(TimeSlot, ServiceRequest.slot_id == TimeSlot.id)
         .options(joinedload(ServiceRequest.vehicle), joinedload(ServiceRequest.slot)))
    if user.role == "customer":
        q = q.filter(ServiceRequest.customer_id == user.id)
    elif user.role == "mechanic":
        q = q.filter(ServiceRequest.mechanic_id == (user.mechanic.id if user.mechanic else -1))
    a = request.args
    if a.get("status"):
        statuses = [s for s in a["status"].split(",") if s]
        bad = [s for s in statuses if s not in REQUEST_STATUSES]
        if bad:
            raise validation_error(f"Unknown status: {bad[0]}", "status")
        q = q.filter(ServiceRequest.status.in_(statuses))
    if a.get("vehicle_id", type=int):
        q = q.filter(ServiceRequest.vehicle_id == a.get("vehicle_id", type=int))
    if user.role == "admin":
        if a.get("customer_id", type=int):
            q = q.filter(ServiceRequest.customer_id == a.get("customer_id", type=int))
        if a.get("mechanic_id", type=int):
            q = q.filter(ServiceRequest.mechanic_id == a.get("mechanic_id", type=int))
    if a.get("date_from"):
        q = q.filter(TimeSlot.date >= parse_date(a["date_from"], "date_from"))
    if a.get("date_to"):
        q = q.filter(TimeSlot.date <= parse_date(a["date_to"], "date_to"))
    if a.get("q") and user.role != "customer":
        term = f"%{a['q'].strip()}%"
        conds = [Vehicle.registration_number.ilike(term.replace(" ", "")), User.name.ilike(term),
                 User.contact.like(term)]
        if a["q"].strip().lstrip("#").isdigit():
            conds.append(ServiceRequest.id == int(a["q"].strip().lstrip("#")))
        q = q.filter(or_(*conds))
    q = q.order_by(ServiceRequest.created_at.desc(), ServiceRequest.id.desc())
    return jsonify(paginate(q, lambda r: r.to_dict()))


@bp.get("/<int:rid>")
@role_required()
def get_request(rid):
    return jsonify(booking_service.load_request_for(current_user(), rid).to_dict(detail=True))


@bp.post("/<int:rid>/cancel")
@role_required("customer", "admin")
def cancel(rid):
    user = current_user()
    req = booking_service.load_request_for(user, rid)
    return jsonify(booking_service.cancel(req, user).to_dict(detail=True))


@bp.delete("/<int:rid>")
@role_required("admin")
def delete_request(rid):
    req = get_or_404(ServiceRequest, rid, "Service request")
    booking_service.delete_request(req)
    return jsonify({"message": "Service request deleted"})


@bp.post("/<int:rid>/assign")
@role_required("admin")
def assign(rid):
    req = get_or_404(ServiceRequest, rid, "Service request")
    d = json_body()
    mid = d.get("mechanic_id")
    if not isinstance(mid, int) or isinstance(mid, bool):
        raise validation_error("mechanic_id is required", "mechanic_id")
    return jsonify(booking_service.assign(req, mid, current_user()).to_dict(detail=True))


# ---- mechanic job flow (BR-1/BR-2: mechanics only touch their own jobs) -----------
@bp.put("/<int:rid>/status")
@role_required("mechanic")
def update_status(rid):
    req = _job_for_mechanic(rid)
    d = json_body()
    status = d.get("status")
    if status not in REQUEST_STATUSES:
        raise validation_error("A valid status is required", "status")
    req = booking_service.change_status(req, status, current_user(), d.get("note"),
                                        bool(d.get("no_parts_confirmed")))
    return jsonify(req.to_dict(detail=True))


@bp.post("/<int:rid>/parts")
@role_required("mechanic")
def add_part(rid):
    req = _job_for_mechanic(rid)
    d = json_body()
    jpu = inventory_service.add_part(req, d.get("part_id"), d.get("quantity"), current_user())
    return jsonify({"part_used": jpu.to_dict(), "request": req.to_dict(detail=True)}), 201


@bp.put("/<int:rid>/parts/<int:jid>")
@role_required("mechanic")
def update_part(rid, jid):
    req = _job_for_mechanic(rid)
    jpu = db.session.get(JobPartUsed, jid)
    if not jpu or jpu.request_id != req.id:
        raise ApiError("Part entry not found", 404, "not_found")
    jpu = inventory_service.update_part(req, jpu, json_body().get("quantity"), current_user())
    return jsonify({"part_used": jpu.to_dict(), "request": req.to_dict(detail=True)})


@bp.delete("/<int:rid>/parts/<int:jid>")
@role_required("mechanic")
def remove_part(rid, jid):
    req = _job_for_mechanic(rid)
    jpu = db.session.get(JobPartUsed, jid)
    if not jpu or jpu.request_id != req.id:
        raise ApiError("Part entry not found", 404, "not_found")
    inventory_service.remove_part(req, jpu)
    return jsonify({"message": "Part removed and stock restored", "request": req.to_dict(detail=True)})


@bp.post("/<int:rid>/labour")
@role_required("mechanic")
def add_labour(rid):
    req = _job_for_mechanic(rid)
    entry = inventory_service.add_labour(req, json_body())
    return jsonify({"labour": entry.to_dict(), "request": req.to_dict(detail=True)}), 201


@bp.delete("/<int:rid>/labour/<int:lid>")
@role_required("mechanic")
def remove_labour(rid, lid):
    req = _job_for_mechanic(rid)
    entry = db.session.get(JobLabour, lid)
    if not entry or entry.request_id != req.id:
        raise ApiError("Labour entry not found", 404, "not_found")
    inventory_service.remove_labour(req, entry)
    return jsonify({"message": "Labour entry removed", "request": req.to_dict(detail=True)})


@bp.post("/<int:rid>/complete")
@role_required("mechanic")
def complete(rid):
    req = _job_for_mechanic(rid)
    d = request.get_json(silent=True) or {}
    req = booking_service.complete_job(req, current_user(), bool(d.get("no_parts_confirmed")))
    out = req.to_dict(detail=True)
    out["invoice_detail"] = req.invoice.to_dict()
    return jsonify(out)
