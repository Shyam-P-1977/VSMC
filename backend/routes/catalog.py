import re
import uuid
from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required, hash_password, generate_jwt
from models import Service, Time_Slot, Service_Center, Center_Service, User
from services.booking_service import ensure_slots_for_date, check_slot_availability, find_alternate_slots
from services.location_data import get_all_cities, get_areas_for_city, haversine_distance, find_nearest_area, MAHARASHTRA_LOCATIONS

catalog_bp = Blueprint('catalog', __name__, url_prefix='/api')

# ========================================================
# LOCATION ENDPOINTS
# ========================================================

@catalog_bp.route('/locations/cities', methods=['GET'])
def list_cities():
    cities = get_all_cities()
    return jsonify({"cities": cities}), 200

@catalog_bp.route('/locations/areas', methods=['GET'])
def list_areas():
    city = request.args.get('city', '').strip()
    if not city:
        return jsonify({"areas": []}), 200
    areas = get_areas_for_city(city)
    return jsonify({"city": city, "areas": areas}), 200

@catalog_bp.route('/locations/nearest', methods=['POST'])
def find_nearest():
    data = request.get_json() or {}
    lat = data.get('lat') or data.get('latitude')
    lng = data.get('lng') or data.get('longitude')
    if lat is None or lng is None:
        return jsonify({"error": "Latitude and longitude required", "code": "VALIDATION_ERROR"}), 400

    nearest = find_nearest_area(lat, lng)
    if not nearest:
        return jsonify({"error": "No matching area found", "code": "NOT_FOUND"}), 404
    return jsonify({"nearest": nearest}), 200


# ========================================================
# SERVICE CENTERS (Customer Discovery)
# ========================================================

@catalog_bp.route('/centers', methods=['GET'])
def list_centers():
    """
    Returns approved and active service centers.
    Filterable by lat, lng, radius (default 25km), city, area, and search query q.
    Sorted by Haversine distance if lat/lng are provided.
    """
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius', default=25.0, type=float)
    city_filter = request.args.get('city', '').strip()
    area_filter = request.args.get('area', '').strip()
    query_text = request.args.get('q', '').strip().lower()

    # Base query: Approved and Active
    q = Service_Center.query.filter_by(approval_status='Approved', is_active=True)

    if city_filter:
        q = q.filter(Service_Center.city.ilike(f"%{city_filter}%"))
    if area_filter:
        q = q.filter(Service_Center.area.ilike(f"%{area_filter}%"))
    if query_text:
        q = q.filter(
            (Service_Center.name.ilike(f"%{query_text}%")) |
            (Service_Center.address.ilike(f"%{query_text}%")) |
            (Service_Center.city.ilike(f"%{query_text}%")) |
            (Service_Center.area.ilike(f"%{query_text}%"))
        )

    all_centers = q.all()
    results = []

    for center in all_centers:
        c_dict = center.to_dict()
        
        # Calculate distance
        if lat is not None and lng is not None and center.latitude is not None and center.longitude is not None:
            dist = haversine_distance(lat, lng, center.latitude, center.longitude)
            c_dict["distance_km"] = dist
        else:
            c_dict["distance_km"] = None

        # Check radius filter if lat/lng provided
        if lat is not None and lng is not None and radius is not None and c_dict["distance_km"] is not None:
            if c_dict["distance_km"] > radius:
                continue

        results.append(c_dict)

    # Sort: centers with distance_km first, sorted ascending
    if lat is not None and lng is not None:
        results.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"] or 0))
    else:
        results.sort(key=lambda x: x["name"])

    return jsonify({
        "centers": results,
        "total": len(results),
        "radius_km": radius,
        "user_lat": lat,
        "user_lng": lng
    }), 200

@catalog_bp.route('/centers/<int:center_id>', methods=['GET'])
def get_center_details(center_id):
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    # Fetch offered services
    offered = Center_Service.query.filter_by(center_id=center_id, is_active=True).all()
    services_list = []
    for cs in offered:
        if cs.service and cs.service.Is_Active:
            s_dict = cs.to_dict()
            services_list.append(s_dict)

    center_dict = center.to_dict()
    center_dict["services"] = services_list
    return jsonify({"center": center_dict}), 200

@catalog_bp.route('/centers/<int:center_id>/slots', methods=['GET'])
def get_center_slots(center_id):
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    date_str = request.args.get('date')
    if not date_str:
        date_str = date.today().isoformat()

    slots = ensure_slots_for_date(date_str, center_id=center_id)
    return jsonify({
        "center_id": center_id,
        "date": date_str,
        "slots": [s.to_dict() for s in slots]
    }), 200

@catalog_bp.route('/centers/<int:center_id>/slots/check', methods=['POST'])
def check_slot(center_id):
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    slot_id = data.get('slot_id')
    if not slot_id:
        return jsonify({"error": "slot_id is required", "code": "VALIDATION_ERROR"}), 400

    result = check_slot_availability(slot_id, center_id=center_id)
    return jsonify(result), 200

@catalog_bp.route('/centers/register', methods=['POST'])
def register_center():
    """
    Public registration for service center owners.
    Creates user with role 'center' and Service_Center with unique center_code.
    """
    data = request.get_json() or {}
    
    # Owner details (accept both camelCase / alternative keys)
    owner_name = (data.get('owner_name') or data.get('ownerName') or '').strip()
    email = (data.get('email') or data.get('owner_email') or data.get('ownerEmail') or '').strip().lower()
    phone = (data.get('phone') or data.get('owner_contact') or data.get('ownerContact') or '').strip()
    password = data.get('password') or data.get('owner_password') or data.get('ownerPassword') or ''
    
    # Center details
    center_name = (data.get('name') or data.get('center_name') or data.get('centerName') or '').strip()
    address = (data.get('address') or '').strip()
    city = (data.get('city') or 'Pune').strip()
    area = (data.get('area') or '').strip()
    state = (data.get('state') or 'Maharashtra').strip()
    pincode = (data.get('pincode') or '').strip()
    lat = data.get('latitude') or data.get('lat')
    lng = data.get('longitude') or data.get('lng')
    working_hours = (data.get('working_hours') or '09:00 - 18:00').strip()
    working_days = (data.get('working_days') or 'Monday - Saturday').strip()
    description = (data.get('description') or '').strip()

    # Clean phone
    raw_phone = re.sub(r'\D', '', phone)
    if len(raw_phone) > 10 and (raw_phone.startswith('91') or raw_phone.startswith('0')):
        phone = raw_phone[-10:]
    else:
        phone = raw_phone

    if not owner_name or not email or not phone or not password or not center_name:
        return jsonify({
            "error": "Owner name, email, phone, password, and service center name are required",
            "code": "VALIDATION_ERROR"
        }), 400

    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return jsonify({"error": "Invalid email address format", "code": "INVALID_EMAIL"}), 422

    if not re.match(r'^\d{10}$', phone):
        return jsonify({"error": "Contact phone must be exactly 10 digits", "code": "INVALID_PHONE"}), 422

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long", "code": "WEAK_PASSWORD"}), 422

    if User.query.filter_by(Email=email).first():
        return jsonify({"error": "An account with this email already exists", "code": "DUPLICATE_EMAIL"}), 409

    if User.query.filter_by(Contact=phone).first():
        return jsonify({"error": "An account with this phone already exists", "code": "DUPLICATE_PHONE"}), 409

    # Determine default coordinates if lat/lng missing
    if lat is None or lng is None:
        city_data = MAHARASHTRA_LOCATIONS.get(city)
        if city_data:
            lat = city_data.get('lat', 18.5204)
            lng = city_data.get('lng', 73.8567)
            if area:
                for a in city_data.get('areas', []):
                    if a.get('name', '').lower() == area.lower():
                        lat = a.get('lat', lat)
                        lng = a.get('lng', lng)
                        if not pincode:
                            pincode = a.get('pincode', '')
                        break
        else:
            lat = 18.5204
            lng = 73.8567

    # Generate unique center code
    prefix = city[:3].upper() if city else "CTR"
    center_code = f"VSC-{prefix}-{uuid.uuid4().hex[:4].upper()}"
    while Service_Center.query.filter_by(center_code=center_code).first():
        center_code = f"VSC-{prefix}-{uuid.uuid4().hex[:4].upper()}"

    # Create Owner User
    owner = User(
        Name=owner_name,
        Email=email,
        Contact=phone,
        Password_Hash=hash_password(password),
        Role='center',
        Address=address,
        city=city,
        area=area,
        state=state,
        Is_Active=True
    )
    db.session.add(owner)
    db.session.flush()

    # Create Service Center
    center = Service_Center(
        name=center_name,
        center_code=center_code,
        owner_user_id=owner.User_ID,
        email=email,
        phone=phone,
        address=address or f"{area or city}, {city}",
        city=city,
        area=area or city,
        state=state,
        pincode=pincode or '411001',
        latitude=float(lat),
        longitude=float(lng),
        working_hours=working_hours,
        working_days=working_days,
        description=description or f"Authorized multi-brand automotive repair workshop in {area or city}, {city}.",
        approval_status='Approved',
        is_active=True
    )
    db.session.add(center)
    db.session.flush()

    owner.center_id = center.id

    # Attach all standard catalog services to this new center
    catalog_services = Service.query.filter_by(Is_Active=True).all()
    for cs in catalog_services:
        db.session.add(Center_Service(
            center_id=center.id,
            service_id=cs.Service_ID,
            price=cs.Base_Price,
            estimated_hours=cs.Estimated_Hours,
            is_active=True
        ))

    # Auto-generate booking slots for 14 days ahead
    try:
        today = date.today()
        for i in range(14):
            ensure_slots_for_date(center.id, (today + timedelta(days=i)).isoformat())
    except Exception as e:
        print("[*] Slot generation notice for new center:", e)

    db.session.commit()

    token = generate_jwt(owner)
    return jsonify({
        "message": f"Service center registered successfully! Your Workshop Center Code is {center_code}.",
        "center_code": center_code,
        "token": token,
        "center": center.to_dict(),
        "owner": owner.to_dict()
    }), 201


@catalog_bp.route('/centers/verify-code/<center_code>', methods=['GET'])
def verify_center_code(center_code):
    """
    Verify and lookup service center by Center Code (e.g. VSC-PUN-ABCD)
    """
    code_clean = (center_code or '').strip().upper()
    center = Service_Center.query.filter_by(center_code=code_clean).first()
    if not center:
        if code_clean.startswith('CTR-') and code_clean[4:].isdigit():
            c_id = int(code_clean[4:])
            center = db.session.get(Service_Center, c_id)

    if not center:
        return jsonify({
            "valid": False,
            "error": f"Center Code '{code_clean}' not found. Please verify with your workshop owner.",
            "code": "CENTER_NOT_FOUND"
        }), 404

    return jsonify({
        "valid": True,
        "center": {
            "id": center.id,
            "name": center.name,
            "center_code": center.center_code or f"CTR-{center.id:04d}",
            "city": center.city,
            "area": center.area,
            "address": center.address,
            "approval_status": center.approval_status
        }
    }), 200


# ========================================================
# GLOBAL CATALOG SERVICES (Admin / Center compatibility)
# ========================================================

@catalog_bp.route('/services', methods=['GET'])
def list_services():
    show_all = request.args.get('all', 'false').lower() == 'true'
    center_id = request.args.get('center_id', type=int)

    if center_id:
        # Return center-specific pricing
        c_services = Center_Service.query.filter_by(center_id=center_id, is_active=True).all()
        return jsonify({"services": [cs.to_dict() for cs in c_services]}), 200

    if show_all:
        services = Service.query.all()
    else:
        services = Service.query.filter_by(Is_Active=True).all()
    return jsonify({"services": [s.to_dict() for s in services]}), 200

@catalog_bp.route('/services', methods=['POST'])
@role_required('admin', 'platform_admin', 'center')
def create_service():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    base_price = data.get('base_price')
    estimated_hours = data.get('estimated_hours', 1.0)

    if not name or base_price is None:
        return jsonify({"error": "Service name and base price are required", "code": "VALIDATION_ERROR"}), 400

    service = Service(
        Name=name,
        Description=description,
        Base_Price=float(base_price),
        Estimated_Hours=float(estimated_hours),
        Is_Active=True
    )
    db.session.add(service)
    db.session.commit()
    return jsonify({"message": "Service created", "service": service.to_dict()}), 201

@catalog_bp.route('/services/<int:service_id>', methods=['PUT'])
@role_required('admin', 'platform_admin', 'center')
def update_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        service.Name = data['name'].strip()
    if 'description' in data:
        service.Description = data['description']
    if 'base_price' in data:
        service.Base_Price = float(data['base_price'])
    if 'estimated_hours' in data:
        service.Estimated_Hours = float(data['estimated_hours'])
    if 'is_active' in data:
        service.Is_Active = bool(data['is_active'])

    db.session.commit()
    return jsonify({"message": "Service updated", "service": service.to_dict()}), 200

@catalog_bp.route('/services/<int:service_id>', methods=['DELETE'])
@role_required('admin', 'platform_admin', 'center')
def delete_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found", "code": "NOT_FOUND"}), 404

    service.Is_Active = False
    db.session.commit()
    return jsonify({"message": "Service deactivated successfully", "service": service.to_dict()}), 200

@catalog_bp.route('/slots', methods=['GET'])
def get_slots():
    date_str = request.args.get('date')
    center_id = request.args.get('center_id', type=int)
    if not date_str:
        date_str = date.today().isoformat()

    slots = ensure_slots_for_date(date_str, center_id=center_id)
    return jsonify({
        "date": date_str,
        "slots": [s.to_dict() for s in slots]
    }), 200

@catalog_bp.route('/slots/<int:slot_id>', methods=['PUT'])
@role_required('admin', 'center')
def update_slot_capacity(slot_id):
    slot = db.session.get(Time_Slot, slot_id)
    if not slot:
        return jsonify({"error": "Slot not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    capacity = data.get('capacity')
    if capacity is None or int(capacity) < slot.Booked_Count:
        return jsonify({
            "error": f"Capacity cannot be lower than currently booked count ({slot.Booked_Count})",
            "code": "INVALID_CAPACITY"
        }), 400

    slot.Capacity = int(capacity)
    db.session.commit()
    return jsonify({"message": "Slot capacity updated", "slot": slot.to_dict()}), 200
