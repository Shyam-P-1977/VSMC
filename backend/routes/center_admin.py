from datetime import datetime, date
from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required, hash_password
from models import (
    Service_Center, Center_Service, Service, Mechanic, User, Spare_Part,
    Time_Slot, Service_Request, Invoice
)
from services.booking_service import ensure_slots_for_date
from services.tenancy import get_current_center_id, get_or_404_in_center

center_bp = Blueprint('center', __name__, url_prefix='/api/center')

def get_user_center(user):
    target_center_id = get_current_center_id(user)
    if not target_center_id:
        return None
    return db.session.get(Service_Center, target_center_id)


# ========================================================
# CENTER PROFILE
# ========================================================

@center_bp.route('/profile', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_center_profile():
    center_id = get_current_center_id(request.current_user)
    if not center_id:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    return jsonify({"center": center.to_dict()}), 200

@center_bp.route('/profile', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_profile():
    center_id = get_current_center_id(request.current_user)
    if not center_id:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404
    center = db.session.get(Service_Center, center_id)
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
    center_id = get_current_center_id(request.current_user)
    if not center_id:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    # All catalog services
    catalog = Service.query.all()
    center_services = Center_Service.query.filter_by(center_id=center_id).all()
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

    return jsonify({"services": results, "center_id": center_id}), 200

@center_bp.route('/services', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def configure_center_service():
    center_id = get_current_center_id(request.current_user)
    if not center_id:
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

    cs = Center_Service.query.filter_by(center_id=center_id, service_id=service_id).first()
    if cs:
        cs.price = float(price)
        cs.estimated_hours = float(estimated_hours)
        cs.is_active = bool(is_active)
    else:
        cs = Center_Service(
            center_id=center_id,
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
    center_id = get_current_center_id(request.current_user)
    cs = get_or_404_in_center(Center_Service, center_service_id, center_id)

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
    center_id = get_current_center_id(request.current_user)
    cs = get_or_404_in_center(Center_Service, center_service_id, center_id)

    cs.is_active = False
    db.session.commit()
    return jsonify({"message": "Center service disabled"}), 200


# ========================================================
# CENTER MECHANICS
# ========================================================

@center_bp.route('/mechanics', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def list_center_mechanics():
    center_id = get_current_center_id(request.current_user)
    if not center_id:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    mechanics = Mechanic.query.filter_by(center_id=center_id).all()
    return jsonify({"mechanics": [m.to_dict() for m in mechanics]}), 200

@center_bp.route('/mechanics', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def add_center_mechanic():
    center_id = get_current_center_id(request.current_user)
    if not center_id:
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
        center_id=center_id,
        Is_Active=True
    )
    db.session.add(user)
    db.session.flush()

    # Create Mechanic Profile
    mech = Mechanic(
        User_ID=user.User_ID,
        center_id=center_id,
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
    center_id = get_current_center_id(request.current_user)
    mech = get_or_404_in_center(Mechanic, mechanic_id, center_id)

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
# CENTER SPARE PARTS INVENTORY (Delegated to routes.inventory)
# ========================================================

@center_bp.route('/parts', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def list_center_parts():
    from routes.inventory import list_parts
    return list_parts()

@center_bp.route('/parts/summary', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_center_parts_summary():
    from routes.inventory import get_inventory_summary
    return get_inventory_summary()

@center_bp.route('/parts/low-stock', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def get_center_low_stock_parts():
    from routes.inventory import get_low_stock_parts
    return get_low_stock_parts()

@center_bp.route('/parts', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def add_center_part():
    from routes.inventory import add_part
    return add_part()

@center_bp.route('/parts/<int:part_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_part(part_id):
    from routes.inventory import update_part
    return update_part(part_id)

@center_bp.route('/parts/<int:part_id>', methods=['DELETE'])
@role_required('admin', 'center', 'platform_admin')
def delete_center_part(part_id):
    from routes.inventory import delete_part
    return delete_part(part_id)

@center_bp.route('/parts/<int:part_id>/adjust', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def adjust_center_part_stock(part_id):
    from routes.inventory import adjust_part_stock
    return adjust_part_stock(part_id)

@center_bp.route('/parts/load-defaults', methods=['POST'])
@role_required('admin', 'center', 'platform_admin')
def load_center_default_parts():
    from routes.inventory import load_default_parts
    return load_default_parts()


# ========================================================
# CENTER SLOTS
# ========================================================

@center_bp.route('/slots', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def list_center_slots():
    center_id = get_current_center_id(request.current_user)
    if not center_id:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    target_date = request.args.get('date', date.today().isoformat())
    slots = ensure_slots_for_date(target_date, center_id=center_id)
    return jsonify({"date": target_date, "slots": [s.to_dict() for s in slots]}), 200

@center_bp.route('/slots/<int:slot_id>', methods=['PUT'])
@role_required('admin', 'center', 'platform_admin')
def update_center_slot(slot_id):
    center_id = get_current_center_id(request.current_user)
    slot = get_or_404_in_center(Time_Slot, slot_id, center_id)

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
    center_id = get_current_center_id(request.current_user)
    if not center_id:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Center not found", "code": "NOT_FOUND"}), 404

    pending_count = Service_Request.query.filter_by(center_id=center_id, Status="Pending Approval").count()
    accepted_count = Service_Request.query.filter_by(center_id=center_id, Status="Accepted").count()
    active_count = Service_Request.query.filter(
        Service_Request.center_id == center_id,
        Service_Request.Status.in_(["Assigned", "In Progress", "Awaiting Parts"])
    ).count()
    completed_count = Service_Request.query.filter_by(center_id=center_id, Status="Completed").count()

    # Center revenue
    invoices = Invoice.query.filter_by(center_id=center_id, Status="Paid").all()
    total_revenue = sum(inv.Total_Amount for inv in invoices)

    # Low stock count
    low_stock = Spare_Part.query.filter(
        Spare_Part.center_id == center_id,
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
