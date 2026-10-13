from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required
from models import Spare_Part

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/parts')

def get_effective_center_id(user):
    if user.Role in ['admin', 'center']:
        return user.center_id or (user.owned_center.id if user.owned_center else None)
    if user.Role == 'mechanic' and user.mechanic_profile:
        return user.mechanic_profile.center_id
    return None

@inventory_bp.route('', methods=['GET'])
@token_required
def list_parts():
    user = request.current_user
    search = request.args.get('search', '').strip()
    low_stock_only = request.args.get('low_stock', 'false').lower() == 'true'
    center_id_param = request.args.get('center_id', type=int)

    query = Spare_Part.query
    center_id = center_id_param or get_effective_center_id(user)
    if center_id:
        query = query.filter_by(center_id=center_id)

    if search:
        query = query.filter(Spare_Part.Name.ilike(f"%{search}%"))
    if low_stock_only:
        query = query.filter(Spare_Part.Quantity_In_Stock <= Spare_Part.Min_Threshold)

    parts = query.order_by(Spare_Part.Name.asc()).all()
    return jsonify({"parts": [p.to_dict() for p in parts]}), 200

@inventory_bp.route('/low-stock', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_low_stock_parts():
    user = request.current_user
    query = Spare_Part.query.filter(Spare_Part.Quantity_In_Stock <= Spare_Part.Min_Threshold)
    center_id = get_effective_center_id(user)
    if center_id:
        query = query.filter_by(center_id=center_id)

    parts = query.all()
    return jsonify({
        "count": len(parts),
        "parts": [p.to_dict() for p in parts]
    }), 200

@inventory_bp.route('', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def add_part():
    user = request.current_user
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    price = data.get('price')
    quantity = data.get('quantity_in_stock', 0)
    min_threshold = data.get('min_threshold', 5)
    center_id = data.get('center_id') or get_effective_center_id(user) or 1

    if not name or price is None:
        return jsonify({"error": "Part name and unit price are required", "code": "VALIDATION_ERROR"}), 400

    part = Spare_Part(
        center_id=center_id,
        Name=name,
        Price=float(price),
        Quantity_In_Stock=int(quantity),
        Min_Threshold=int(min_threshold)
    )
    db.session.add(part)
    db.session.commit()

    return jsonify({"message": "Spare part added successfully", "part": part.to_dict()}), 201

@inventory_bp.route('/<int:part_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_part(part_id):
    user = request.current_user
    part = db.session.get(Spare_Part, part_id)
    if not part:
        return jsonify({"error": "Spare part not found", "code": "NOT_FOUND"}), 404

    center_id = get_effective_center_id(user)
    if center_id and part.center_id != center_id and user.Role != 'platform_admin':
        return jsonify({"error": "Forbidden: Part belongs to another center", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        part.Name = data['name'].strip()
    if 'price' in data and data['price'] is not None:
        part.Price = float(data['price'])
    if 'quantity_in_stock' in data and data['quantity_in_stock'] is not None:
        part.Quantity_In_Stock = int(data['quantity_in_stock'])
    if 'min_threshold' in data and data['min_threshold'] is not None:
        part.Min_Threshold = int(data['min_threshold'])

    db.session.commit()
    return jsonify({"message": "Spare part updated successfully", "part": part.to_dict()}), 200

@inventory_bp.route('/<int:part_id>', methods=['DELETE'])
@role_required('admin', 'center', 'platform_admin')
def delete_part(part_id):
    user = request.current_user
    part = db.session.get(Spare_Part, part_id)
    if not part:
        return jsonify({"error": "Spare part not found", "code": "NOT_FOUND"}), 404

    center_id = get_effective_center_id(user)
    if center_id and part.center_id != center_id and user.Role != 'platform_admin':
        return jsonify({"error": "Forbidden", "code": "FORBIDDEN"}), 403

    db.session.delete(part)
    db.session.commit()
    return jsonify({"message": "Spare part deleted successfully"}), 200
