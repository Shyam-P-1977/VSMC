from datetime import datetime, date
from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required, hash_password
from models import (
    Service_Center, Center_Service, Service, Mechanic, User, Spare_Part,
    Time_Slot, Service_Request, Invoice
)
from services.booking_service import ensure_slots_for_date

center_bp = Blueprint('center', __name__, url_prefix='/api/center')

def get_user_center(user):
    target_center_id = user.center_id
    if not target_center_id and user.owned_centers:
        return user.owned_centers[0]
    if not target_center_id and hasattr(user, 'owned_center') and user.owned_center:
        target_center_id = user.owned_center.id
    if not target_center_id:
        return Service_Center.query.first()
    return db.session.get(Service_Center, target_center_id)

# ========================================================
# CENTER PROFILE
# ========================================================

@center_bp.route('/profile', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_center_profile():
    center = get_user_center(request.current_user)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    return jsonify({"center": center.to_dict()}), 200

@center_bp.route('/profile', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_profile():
    center = get_user_center(request.current_user)
    if not center:
        center = db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        center.name = data['name'].strip()
    if 'phone' in data and data['phone'].strip():
        center.phone = data['phone'].strip()
    if 'address' in data:
        center.address = data['address'].strip()
    if 'city' in data:
        center.city = data['city'].strip()
    if 'area' in data:
        center.area = data['area'].strip()
    if 'state' in data:
        center.state = data['state'].strip()
    if 'pincode' in data:
        center.pincode = data['pincode'].strip()
    if 'working_hours' in data:
        center.working_hours = data['working_hours'].strip()
    if 'working_days' in data:
        center.working_days = data['working_days'].strip()
    if 'description' in data:
        center.description = data['description'].strip()
    if 'latitude' in data and data['latitude'] is not None:
        try:
            center.latitude = float(data['latitude'])
        except (ValueError, TypeError):
            pass
    if 'longitude' in data and data['longitude'] is not None:
        try:
            center.longitude = float(data['longitude'])
        except (ValueError, TypeError):
            pass

    db.session.commit()
    return jsonify({
        "message": "Service center profile updated successfully",
        "center": center.to_dict()
    }), 200


# ========================================================
# CENTER SERVICES & PRICING
# ========================================================

@center_bp.route('/services', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_center_services():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    # All catalog services
    catalog = Service.query.all()
    center_services = Center_Service.query.filter_by(center_id=center.id).all()
    cs_map = {cs.service_id: cs for cs in center_services}

    results = []
    for s in catalog:
        cs = cs_map.get(s.Service_ID)
        results.append({
            "service_id": s.Service_ID,
            "center_service_id": cs.id if cs else None,
            "name": s.Name,
            "description": s.Description,
            "catalog_base_price": s.Base_Price,
            "price": cs.price if cs else s.Base_Price,
            "estimated_hours": cs.estimated_hours if cs else s.Estimated_Hours,
            "is_offered": cs.is_active if cs else False,
            "is_active": cs.is_active if cs else False
        })

    return jsonify({"services": results, "center_id": center.id}), 200

@center_bp.route('/services', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def configure_center_service():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    service_id = data.get('service_id')
    price = data.get('price')
    estimated_hours = data.get('estimated_hours', 1.0)
    is_active = data.get('is_active', True)

    if not service_id or price is None:
        return jsonify({"error": "service_id and price are required", "code": "VALIDATION_ERROR"}), 400

    catalog_svc = db.session.get(Service, service_id)
    if not catalog_svc:
        return jsonify({"error": "Catalog service not found", "code": "NOT_FOUND"}), 404

    cs = Center_Service.query.filter_by(center_id=center.id, service_id=service_id).first()
    if cs:
        cs.price = float(price)
        cs.estimated_hours = float(estimated_hours)
        cs.is_active = bool(is_active)
    else:
        cs = Center_Service(
            center_id=center.id,
            service_id=service_id,
            price=float(price),
            estimated_hours=float(estimated_hours),
            is_active=bool(is_active)
        )
        db.session.add(cs)

    db.session.commit()
    return jsonify({"message": "Service configured for center", "service": cs.to_dict()}), 200

@center_bp.route('/services/<int:center_service_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_service(center_service_id):
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    cs = db.session.get(Center_Service, center_service_id)
    if not cs:
        return jsonify({"error": "Center service not found", "code": "NOT_FOUND"}), 404

    if center and cs.center_id != center.id:
        return jsonify({"error": "Forbidden: This service belongs to another center", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    if 'price' in data and data['price'] is not None:
        cs.price = float(data['price'])
    if 'estimated_hours' in data and data['estimated_hours'] is not None:
        cs.estimated_hours = float(data['estimated_hours'])
    if 'is_active' in data:
        cs.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify({"message": "Center service updated", "service": cs.to_dict()}), 200

@center_bp.route('/services/<int:center_service_id>', methods=['DELETE'])
@role_required('admin', 'center', 'platform_admin')
def disable_center_service(center_service_id):
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    cs = db.session.get(Center_Service, center_service_id)
    if not cs:
        return jsonify({"error": "Center service not found", "code": "NOT_FOUND"}), 404

    if center and cs.center_id != center.id:
        return jsonify({"error": "Forbidden", "code": "FORBIDDEN"}), 403

    cs.is_active = False
    db.session.commit()
    return jsonify({"message": "Center service disabled"}), 200


# ========================================================
# CENTER MECHANICS
# ========================================================

@center_bp.route('/mechanics', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def list_center_mechanics():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    mechanics = Mechanic.query.filter_by(center_id=center.id).all()
    return jsonify({"mechanics": [m.to_dict() for m in mechanics]}), 200

@center_bp.route('/mechanics', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def add_center_mechanic():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    password = data.get('password', 'Mechanic@123')
    specialization = data.get('specialization', 'General Specialist').strip()
    experience = data.get('experience_years', 3)

    if not name or not email or not phone:
        return jsonify({"error": "Name, email, and phone are required", "code": "VALIDATION_ERROR"}), 400

    if User.query.filter_by(Email=email).first():
        return jsonify({"error": "Email is already registered", "code": "DUPLICATE_EMAIL"}), 409

    if User.query.filter_by(Contact=phone).first():
        return jsonify({"error": "Phone is already registered", "code": "DUPLICATE_PHONE"}), 409

    # Create User
    user = User(
        Name=name,
        Email=email,
        Contact=phone,
        Password_Hash=hash_password(password),
        Role='mechanic',
        center_id=center.id,
        Is_Active=True
    )
    db.session.add(user)
    db.session.flush()

    # Create Mechanic Profile
    mech = Mechanic(
        User_ID=user.User_ID,
        center_id=center.id,
        Specialization=specialization,
        experience_years=int(experience),
        rating=5.0,
        Is_Available=True,
        Is_Active=True
    )
    db.session.add(mech)
    db.session.commit()

    return jsonify({"message": "Mechanic added successfully", "mechanic": mech.to_dict()}), 201

@center_bp.route('/mechanics/<int:mechanic_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_mechanic(mechanic_id):
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    mech = db.session.get(Mechanic, mechanic_id)
    if not mech:
        return jsonify({"error": "Mechanic not found", "code": "NOT_FOUND"}), 404

    if center and mech.center_id != center.id:
        return jsonify({"error": "Forbidden: Mechanic belongs to another center", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        mech.user.Name = data['name'].strip()
    if 'specialization' in data:
        mech.Specialization = data['specialization'].strip()
    if 'experience_years' in data and data['experience_years'] is not None:
        mech.experience_years = int(data['experience_years'])
    if 'is_active' in data:
        mech.Is_Active = bool(data['is_active'])
        mech.user.Is_Active = bool(data['is_active'])
    if 'is_available' in data:
        mech.Is_Available = bool(data['is_available'])

    db.session.commit()
    return jsonify({"message": "Mechanic updated successfully", "mechanic": mech.to_dict()}), 200


# ========================================================
# CENTER SPARE PARTS INVENTORY
# ========================================================

@center_bp.route('/parts', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def list_center_parts():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    parts = Spare_Part.query.filter_by(center_id=center.id).order_by(Spare_Part.Name.asc()).all()
    return jsonify({"parts": [p.to_dict() for p in parts]}), 200

@center_bp.route('/parts', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def add_center_part():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    price = data.get('price')
    quantity = data.get('quantity_in_stock', 0)
    min_threshold = data.get('min_threshold', 5)

    if not name or price is None:
        return jsonify({"error": "Part name and price are required", "code": "VALIDATION_ERROR"}), 400

    part = Spare_Part(
        center_id=center.id,
        Name=name,
        Price=float(price),
        Quantity_In_Stock=int(quantity),
        Min_Threshold=int(min_threshold)
    )
    db.session.add(part)
    db.session.commit()

    return jsonify({"message": "Part added to inventory", "part": part.to_dict()}), 201

@center_bp.route('/parts/<int:part_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_part(part_id):
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    part = db.session.get(Spare_Part, part_id)
    if not part:
        return jsonify({"error": "Part not found", "code": "NOT_FOUND"}), 404

    if center and part.center_id != center.id:
        return jsonify({"error": "Forbidden", "code": "FORBIDDEN"}), 403

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
    return jsonify({"message": "Part updated", "part": part.to_dict()}), 200

@center_bp.route('/parts/<int:part_id>', methods=['DELETE'])
@role_required('admin', 'center', 'platform_admin')
def delete_center_part(part_id):
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    part = db.session.get(Spare_Part, part_id)
    if not part:
        return jsonify({"error": "Part not found", "code": "NOT_FOUND"}), 404

    if center and part.center_id != center.id:
        return jsonify({"error": "Forbidden", "code": "FORBIDDEN"}), 403

    db.session.delete(part)
    db.session.commit()
    return jsonify({"message": "Part deleted from inventory"}), 200


# ========================================================
# CENTER SLOTS
# ========================================================

@center_bp.route('/slots', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def list_center_slots():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    target_date = request.args.get('date', date.today().isoformat())
    slots = ensure_slots_for_date(target_date, center_id=center.id)
    return jsonify({"date": target_date, "slots": [s.to_dict() for s in slots]}), 200

@center_bp.route('/slots/<int:slot_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_slot(slot_id):
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    slot = db.session.get(Time_Slot, slot_id)
    if not slot:
        return jsonify({"error": "Slot not found", "code": "NOT_FOUND"}), 404

    if center and slot.center_id != center.id:
        return jsonify({"error": "Forbidden", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    capacity = data.get('capacity')
    if capacity is None or int(capacity) < slot.Booked_Count:
        return jsonify({"error": f"Capacity cannot be less than booked count ({slot.Booked_Count})", "code": "INVALID_CAPACITY"}), 400

    slot.Capacity = int(capacity)
    db.session.commit()
    return jsonify({"message": "Slot updated", "slot": slot.to_dict()}), 200


# ========================================================
# CENTER REPORTS & SUMMARY
# ========================================================

@center_bp.route('/reports/summary', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def center_summary_report():
    center = get_user_center(request.current_user) or db.session.get(Service_Center, 1)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    pending_count = Service_Request.query.filter_by(center_id=center.id, Status="Pending Approval").count()
    accepted_count = Service_Request.query.filter_by(center_id=center.id, Status="Accepted").count()
    active_count = Service_Request.query.filter(
        Service_Request.center_id == center.id,
        Service_Request.Status.in_(["Assigned", "In Progress", "Awaiting Parts"])
    ).count()
    completed_count = Service_Request.query.filter_by(center_id=center.id, Status="Completed").count()

    # Center revenue
    invoices = Invoice.query.filter_by(center_id=center.id, Status="Paid").all()
    total_revenue = sum(inv.Total_Amount for inv in invoices)

    # Low stock count
    low_stock = Spare_Part.query.filter(
        Spare_Part.center_id == center.id,
        Spare_Part.Quantity_In_Stock <= Spare_Part.Min_Threshold
    ).count()

    return jsonify({
        "center": center.to_dict(),
        "summary": {
            "pending_approval": pending_count,
            "accepted": accepted_count,
            "active_jobs": active_count,
            "completed_jobs": completed_count,
            "total_revenue": round(total_revenue, 2),
            "low_stock_parts": low_stock
        }
    }), 200
