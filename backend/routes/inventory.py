import re
from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required
from models import Spare_Part, Service_Center, Job_Part_Used
from services.inventory_service import seed_default_parts, record_stock_adjustment
from data.default_parts import calculate_stock_status
from services.tenancy import get_current_center_id, scoped_parts, get_or_404_in_center

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/parts')

def get_inventory_scope(user):
    if user.Role == 'platform_admin':
        cid = request.args.get('center_id', type=int)
        return cid, (cid is None)
    return get_current_center_id(user), False

@inventory_bp.route('', methods=['GET'])
@token_required
def list_parts():
    """
    Lists spare parts with strict multi-center isolation, search, category filter,
    status filter, sorting, and optional pagination.
    """
    user = request.current_user
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    status_filter = request.args.get('status', '').strip().lower()
    low_stock_param = request.args.get('low_stock', '').lower() in ['true', '1'] or request.args.get('low_stock_only', '').lower() in ['true', '1']
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int)
    sort_by = request.args.get('sort_by', 'name').lower()
    sort_order = request.args.get('sort_order', 'asc').lower()

    center_id, is_platform_wide = get_inventory_scope(user)

    if is_platform_wide:
        query = Spare_Part.query.filter_by(is_active=True)
    else:
        query = scoped_parts(center_id).filter_by(is_active=True)

    # Search filter (name or sku)
    if search:
        query = query.filter(
            (Spare_Part.Name.ilike(f"%{search}%")) |
            (Spare_Part.sku.ilike(f"%{search}%"))
        )

    # Category filter
    if category and category.lower() != 'all':
        query = query.filter(Spare_Part.category.ilike(category))

    # Low stock only shortcut
    if low_stock_param:
        query = query.filter(
            (Spare_Part.Quantity_In_Stock < Spare_Part.Min_Threshold) |
            (Spare_Part.Quantity_In_Stock <= 0)
        )
    elif status_filter == 'out':
        query = query.filter(Spare_Part.Quantity_In_Stock <= 0)
    elif status_filter == 'low':
        query = query.filter(
            (Spare_Part.Quantity_In_Stock < Spare_Part.Min_Threshold) &
            (Spare_Part.Quantity_In_Stock > 0)
        )
    elif status_filter == 'in':
        query = query.filter(Spare_Part.Quantity_In_Stock >= Spare_Part.Min_Threshold)

    # Sorting
    sort_column_map = {
        'name': Spare_Part.Name,
        'sku': Spare_Part.sku,
        'price': Spare_Part.Price,
        'quantity': Spare_Part.Quantity_In_Stock,
        'category': Spare_Part.category
    }
    sort_col = sort_column_map.get(sort_by, Spare_Part.Name)
    if sort_order == 'desc':
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    total_matched = query.count()

    # Calculate summary metrics for the center's active inventory
    if is_platform_wide:
        base_center_query = Spare_Part.query.filter_by(is_active=True)
    else:
        base_center_query = scoped_parts(center_id).filter_by(is_active=True)
    all_center_parts = base_center_query.all()

    total_count = len(all_center_parts)
    low_count = sum(1 for p in all_center_parts if 0 < p.Quantity_In_Stock < p.Min_Threshold)
    out_count = sum(1 for p in all_center_parts if p.Quantity_In_Stock <= 0)
    stock_value = round(sum(p.Price * p.Quantity_In_Stock for p in all_center_parts), 2)

    summary = {
        "total": total_count,
        "low": low_count,
        "out": out_count,
        "stock_value": stock_value
    }

    # Pagination or all
    if page and per_page and per_page > 0:
        offset = (page - 1) * per_page
        parts = query.offset(offset).limit(per_page).all()
        total_pages = (total_matched + per_page - 1) // per_page
    else:
        parts = query.all()
        page = 1
        per_page = total_matched
        total_pages = 1

    return jsonify({
        "parts": [p.to_dict() for p in parts],
        "total": total_matched,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "summary": summary
    }), 200

@inventory_bp.route('/summary', methods=['GET'])
@token_required
def get_inventory_summary():
    """
    Returns inventory KPI summary for the current workshop.
    """
    user = request.current_user
    center_id, is_platform_wide = get_inventory_scope(user)

    if is_platform_wide:
        query = Spare_Part.query.filter_by(is_active=True)
    else:
        query = scoped_parts(center_id).filter_by(is_active=True)

    parts = query.all()
    total_count = len(parts)
    low_parts = [p for p in parts if 0 < p.Quantity_In_Stock < p.Min_Threshold]
    out_parts = [p for p in parts if p.Quantity_In_Stock <= 0]
    stock_value = round(sum(p.Price * p.Quantity_In_Stock for p in parts), 2)

    # Sort alerts: out of stock first, then lowest stock
    critical_alerts = out_parts + sorted(low_parts, key=lambda x: x.Quantity_In_Stock)

    return jsonify({
        "total": total_count,
        "low": len(low_parts),
        "out": len(out_parts),
        "stock_value": stock_value,
        "critical_parts": [p.to_dict() for p in critical_alerts[:8]]
    }), 200

@inventory_bp.route('/low-stock', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_low_stock_parts():
    """
    Returns all low stock and out of stock parts for workshop alerts.
    """
    user = request.current_user
    center_id, is_platform_wide = get_inventory_scope(user)

    if is_platform_wide:
        query = Spare_Part.query.filter(
            Spare_Part.is_active == True,
            (Spare_Part.Quantity_In_Stock < Spare_Part.Min_Threshold) |
            (Spare_Part.Quantity_In_Stock <= 0)
        )
    else:
        query = scoped_parts(center_id).filter(
            Spare_Part.is_active == True,
            (Spare_Part.Quantity_In_Stock < Spare_Part.Min_Threshold) |
            (Spare_Part.Quantity_In_Stock <= 0)
        )

    parts = query.order_by(Spare_Part.Quantity_In_Stock.asc()).all()
    return jsonify({
        "count": len(parts),
        "parts": [p.to_dict() for p in parts]
    }), 200

@inventory_bp.route('', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def add_part():
    """
    Adds a new spare part to the workshop inventory.
    """
    user = request.current_user
    data = request.get_json() or {}

    name = (data.get('name') or data.get('Name') or '').strip()
    raw_price = data.get('price') if data.get('price') is not None else data.get('Price')
    raw_qty = data.get('quantity_in_stock') if data.get('quantity_in_stock') is not None else (data.get('Quantity_In_Stock') if data.get('Quantity_In_Stock') is not None else data.get('quantity', 0))
    raw_thresh = data.get('min_threshold') if data.get('min_threshold') is not None else (data.get('Min_Threshold') if data.get('Min_Threshold') is not None else 5)
    sku = (data.get('sku') or data.get('SKU') or '').strip().upper() or None
    category = (data.get('category') or data.get('Category') or 'General').strip()
    unit = (data.get('unit') or data.get('Unit') or 'piece').strip().lower()
    is_active = data.get('is_active') if data.get('is_active') is not None else data.get('Is_Active', True)

    if user.Role == 'platform_admin':
        center_id = data.get('center_id') or request.args.get('center_id', type=int)
        if not center_id:
            return jsonify({"error": "center_id is required", "code": "VALIDATION_ERROR"}), 400
    else:
        center_id = get_current_center_id(user)

    if not name or raw_price is None:
        return jsonify({"error": "Part name and unit price are required", "code": "VALIDATION_ERROR"}), 400

    try:
        price = float(raw_price)
        quantity = int(raw_qty)
        min_threshold = int(raw_thresh)
    except (ValueError, TypeError):
        return jsonify({"error": "Price, quantity, and threshold must be valid numbers", "code": "INVALID_NUMBER"}), 400

    if price < 0:
        return jsonify({"error": "Unit price cannot be negative", "code": "INVALID_PRICE"}), 400
    if quantity < 0:
        return jsonify({"error": "Quantity cannot be negative", "code": "INVALID_QUANTITY"}), 400
    if min_threshold < 0:
        return jsonify({"error": "Minimum threshold cannot be negative", "code": "INVALID_THRESHOLD"}), 400

    # SKU uniqueness per center
    if sku:
        existing_sku = Spare_Part.query.filter_by(center_id=center_id, sku=sku).first()
        if existing_sku:
            return jsonify({"error": f"Part SKU '{sku}' is already registered in this workshop", "code": "DUPLICATE_SKU"}), 409

    part = Spare_Part(
        center_id=center_id,
        sku=sku,
        Name=name,
        category=category,
        unit=unit,
        Price=price,
        Quantity_In_Stock=quantity,
        Min_Threshold=min_threshold,
        is_active=bool(is_active)
    )
    db.session.add(part)
    db.session.commit()

    return jsonify({"message": "Spare part added successfully", "part": part.to_dict()}), 201

@inventory_bp.route('/<int:part_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_part(part_id):
    """
    Updates an existing spare part. Enforces center isolation and unique SKU.
    """
    user = request.current_user
    if user.Role == 'platform_admin':
        part = db.session.get(Spare_Part, part_id)
    else:
        center_id = get_current_center_id(user)
        part = get_or_404_in_center(Spare_Part, part_id, center_id=center_id)

    if not part:
        return jsonify({"error": "Spare part not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}

    if 'name' in data or 'Name' in data:
        name_val = (data.get('name') or data.get('Name') or '').strip()
        if name_val:
            part.Name = name_val

    if 'price' in data or 'Price' in data:
        p_val = data.get('price') if 'price' in data else data.get('Price')
        if p_val is not None:
            if float(p_val) < 0:
                return jsonify({"error": "Price cannot be negative", "code": "INVALID_PRICE"}), 400
            part.Price = float(p_val)

    if 'quantity_in_stock' in data or 'Quantity_In_Stock' in data or 'quantity' in data:
        q_val = data.get('quantity_in_stock') if 'quantity_in_stock' in data else (data.get('Quantity_In_Stock') if 'Quantity_In_Stock' in data else data.get('quantity'))
        if q_val is not None:
            if int(q_val) < 0:
                return jsonify({"error": "Quantity cannot be negative", "code": "INVALID_QUANTITY"}), 400
            part.Quantity_In_Stock = int(q_val)

    if 'min_threshold' in data or 'Min_Threshold' in data:
        t_val = data.get('min_threshold') if 'min_threshold' in data else data.get('Min_Threshold')
        if t_val is not None:
            if int(t_val) < 0:
                return jsonify({"error": "Minimum threshold cannot be negative", "code": "INVALID_THRESHOLD"}), 400
            part.Min_Threshold = int(t_val)

    if 'sku' in data or 'SKU' in data:
        s_val = (data.get('sku') or data.get('SKU') or '').strip().upper() or None
        if s_val and s_val != part.sku:
            existing = Spare_Part.query.filter_by(center_id=part.center_id, sku=s_val).first()
            if existing and existing.Part_ID != part.Part_ID:
                return jsonify({"error": f"SKU '{s_val}' is already used by another part in this center", "code": "DUPLICATE_SKU"}), 409
        part.sku = s_val

    if 'category' in data or 'Category' in data:
        part.category = (data.get('category') or data.get('Category') or 'General').strip()
    if 'unit' in data or 'Unit' in data:
        part.unit = (data.get('unit') or data.get('Unit') or 'piece').strip().lower()
    if 'is_active' in data or 'Is_Active' in data:
        val = data.get('is_active') if 'is_active' in data else data.get('Is_Active')
        if val is not None:
            part.is_active = bool(val)

    db.session.commit()
    return jsonify({"message": "Spare part updated successfully", "part": part.to_dict()}), 200

@inventory_bp.route('/<int:part_id>', methods=['DELETE'])
@role_required('admin', 'center', 'platform_admin')
def delete_part(part_id):
    user = request.current_user
    if user.Role == 'platform_admin':
        part = db.session.get(Spare_Part, part_id)
    else:
        center_id = get_current_center_id(user)
        part = get_or_404_in_center(Spare_Part, part_id, center_id=center_id)

    if not part:
        return jsonify({"error": "Spare part not found", "code": "NOT_FOUND"}), 404

    # Check past job usage
    has_past_usage = Job_Part_Used.query.filter_by(Part_ID=part.Part_ID).first() is not None
    if has_past_usage:
        part.is_active = False
        db.session.commit()
        return jsonify({
            "message": "Part deactivated and archived (retained in historical work orders)",
            "part": part.to_dict(),
            "soft_deleted": True
        }), 200

    db.session.delete(part)
    db.session.commit()
    return jsonify({"message": "Spare part deleted successfully", "soft_deleted": False}), 200

@inventory_bp.route('/<int:part_id>/adjust', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def adjust_part_stock(part_id):
    user = request.current_user
    if user.Role == 'platform_admin':
        part = db.session.get(Spare_Part, part_id)
    else:
        center_id = get_current_center_id(user)
        part = get_or_404_in_center(Spare_Part, part_id, center_id=center_id)

    if not part:
        return jsonify({"error": "Spare part not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    delta = data.get('delta')
    reason = data.get('reason', 'Manual Workshop Stock Adjustment')

    if delta is None:
        return jsonify({"error": "Adjustment delta is required", "code": "VALIDATION_ERROR"}), 400

    try:
        delta_int = int(delta)
    except (ValueError, TypeError):
        return jsonify({"error": "Delta must be an integer", "code": "INVALID_DELTA"}), 400

    try:
        updated_part, adjustment = record_stock_adjustment(
            part_id=part.Part_ID,
            delta=delta_int,
            reason=reason,
            user_id=user.User_ID
        )
        return jsonify({
            "message": f"Stock adjusted by {delta_int:+d} units (New Total: {updated_part.Quantity_In_Stock})",
            "part": updated_part.to_dict(),
            "adjustment": adjustment.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e), "code": "INVALID_STOCK_LEVEL"}), 400

@inventory_bp.route('/load-defaults', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def load_default_parts():
    user = request.current_user
    if user.Role == 'platform_admin':
        center_id = request.args.get('center_id', type=int)
        if not center_id:
            return jsonify({"error": "center_id query parameter is required for platform admin", "code": "VALIDATION_ERROR"}), 400
    else:
        center_id = get_current_center_id(user)

    result = seed_default_parts(center_id)
    return jsonify({
        "message": f"{result['added']} parts added ({result['skipped']} existing parts preserved)",
        "added": result["added"],
        "skipped": result["skipped"],
        "center_id": center_id
    }), 200
