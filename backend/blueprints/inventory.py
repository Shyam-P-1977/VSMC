from flask import Blueprint, jsonify, request

from extensions import db
from models import JobPartUsed, SparePart
from services import inventory_service
from utils import ApiError, get_or_404, json_body, paginate, role_required

bp = Blueprint("inventory", __name__, url_prefix="/api/parts")


@bp.get("")
@role_required("admin", "mechanic")
def list_parts():
    q = SparePart.query
    if request.args.get("q"):
        q = q.filter(SparePart.name.ilike(f"%{request.args['q'].strip()}%"))
    if request.args.get("low_stock") == "1":
        q = q.filter(SparePart.quantity_in_stock < SparePart.min_threshold)
    return jsonify(paginate(q.order_by(SparePart.name), lambda p: p.to_dict(), default_per_page=50))


@bp.get("/low-stock")
@role_required("admin")
def low_stock():
    parts = (SparePart.query.filter(SparePart.quantity_in_stock < SparePart.min_threshold)
             .order_by(SparePart.quantity_in_stock).all())
    return jsonify({"items": [p.to_dict() for p in parts], "total": len(parts)})


@bp.post("")
@role_required("admin")
def create_part():
    part = inventory_service.save_part(SparePart(), json_body())
    db.session.add(part)
    db.session.commit()
    return jsonify(part.to_dict()), 201


@bp.put("/<int:pid>")
@role_required("admin")
def update_part(pid):
    part = get_or_404(SparePart, pid, "Spare part")
    inventory_service.save_part(part, json_body(), partial=True)
    db.session.commit()
    return jsonify(part.to_dict())


@bp.delete("/<int:pid>")
@role_required("admin")
def delete_part(pid):
    part = get_or_404(SparePart, pid, "Spare part")
    if JobPartUsed.query.filter_by(part_id=pid).first():
        raise ApiError("This part has been used in jobs and cannot be deleted. Set its stock to 0 instead.",
                       409, "part_in_use")
    db.session.delete(part)
    db.session.commit()
    return jsonify({"message": "Spare part removed"})
