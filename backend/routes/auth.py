import re
from flask import Blueprint, request, jsonify
from extensions import db, hash_password, verify_password, generate_jwt, token_required
from models import User, Mechanic, Service_Center

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'
PHONE_REGEX = r'^\d{10}$'

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    contact = data.get('contact', '').strip() or data.get('phone', '').strip()
    password = data.get('password', '')
    address = data.get('address', '').strip()
    city = data.get('city', '').strip()
    area = data.get('area', '').strip()
    state = data.get('state', 'Maharashtra').strip()

    # Normalize phone format (e.g. +91 9822000000 -> 9822000000)
    raw_contact = re.sub(r'\D', '', contact)
    if len(raw_contact) > 10 and (raw_contact.startswith('91') or raw_contact.startswith('0')):
        contact = raw_contact[-10:]
    else:
        contact = raw_contact

    if not name or not email or not contact or not password:
        return jsonify({"error": "All fields (name, email, contact, password) are required", "code": "VALIDATION_ERROR"}), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({"error": "Invalid email address format", "code": "INVALID_EMAIL"}), 422

    if not re.match(PHONE_REGEX, contact):
        return jsonify({"error": "Contact number must be exactly 10 digits", "code": "INVALID_CONTACT"}), 422

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long", "code": "WEAK_PASSWORD"}), 422

    if User.query.filter_by(Email=email).first():
        return jsonify({"error": "An account with this email already exists", "code": "DUPLICATE_EMAIL"}), 409

    if User.query.filter_by(Contact=contact).first():
        return jsonify({"error": "An account with this contact number already exists", "code": "DUPLICATE_CONTACT"}), 409

    user = User(
        Name=name,
        Email=email,
        Contact=contact,
        Password_Hash=hash_password(password),
        Role='customer',
        Address=address,
        city=city or None,
        area=area or None,
        state=state,
        Is_Active=True
    )
    db.session.add(user)
    db.session.commit()

    token = generate_jwt(user)
    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": user.to_dict()
    }), 201


@auth_bp.route('/register-mechanic', methods=['POST'])
def register_mechanic():
    """
    Public registration for mechanics joining a service center via Center Code.
    """
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    contact = (data.get('contact') or data.get('phone') or '').strip()
    password = data.get('password') or ''
    center_code = (data.get('center_code') or '').strip().upper()
    specialization = (data.get('specialization') or 'General Diagnostics & Service').strip()
    
    try:
        experience_years = int(data.get('experience_years') or 3)
    except (ValueError, TypeError):
        experience_years = 3

    # Normalize phone
    raw_contact = re.sub(r'\D', '', contact)
    if len(raw_contact) > 10 and (raw_contact.startswith('91') or raw_contact.startswith('0')):
        contact = raw_contact[-10:]
    else:
        contact = raw_contact

    if not name or not email or not contact or not password or not center_code:
        return jsonify({
            "error": "Full name, email, contact phone, password, and center code are required",
            "code": "VALIDATION_ERROR"
        }), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({"error": "Invalid email address format", "code": "INVALID_EMAIL"}), 422

    if not re.match(PHONE_REGEX, contact):
        return jsonify({"error": "Contact number must be exactly 10 digits", "code": "INVALID_CONTACT"}), 422

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long", "code": "WEAK_PASSWORD"}), 422

    # Verify Center Code
    center = Service_Center.query.filter_by(center_code=center_code).first()
    if not center:
        if center_code.startswith('CTR-') and center_code[4:].isdigit():
            center = db.session.get(Service_Center, int(center_code[4:]))

    if not center:
        return jsonify({
            "error": f"Invalid Center Code '{center_code}'. Please request the correct code from your workshop owner.",
            "code": "INVALID_CENTER_CODE"
        }), 404

    if User.query.filter_by(Email=email).first():
        return jsonify({"error": "An account with this email already exists", "code": "DUPLICATE_EMAIL"}), 409

    if User.query.filter_by(Contact=contact).first():
        return jsonify({"error": "An account with this contact number already exists", "code": "DUPLICATE_PHONE"}), 409

    # Create User
    user = User(
        Name=name,
        Email=email,
        Contact=contact,
        Password_Hash=hash_password(password),
        Role='mechanic',
        center_id=center.id,
        Address=f"Staff Technician at {center.name}",
        city=center.city,
        area=center.area,
        state=center.state,
        Is_Active=True
    )
    db.session.add(user)
    db.session.flush()

    # Create Mechanic Profile
    mech = Mechanic(
        User_ID=user.User_ID,
        center_id=center.id,
        Specialization=specialization,
        experience_years=experience_years,
        rating=4.8,
        Is_Available=True
    )
    db.session.add(mech)
    db.session.commit()

    token = generate_jwt(user)
    return jsonify({
        "message": f"Welcome aboard, {name}! You have been registered under '{center.name}'.",
        "token": token,
        "user": user.to_dict(),
        "center": {
            "id": center.id,
            "name": center.name,
            "center_code": center.center_code or f"CTR-{center.id:04d}",
            "city": center.city,
            "area": center.area
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role_requested = data.get('role', '').strip().lower()

    if not email or not password:
        return jsonify({"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"}), 401

    user = User.query.filter_by(Email=email).first()
    if not user:
        return jsonify({"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"}), 401

    # Verify password
    if not verify_password(password, user.Password_Hash):
        return jsonify({"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"}), 401

    # Inactive check (Mechanic or Customer or Admin)
    if not user.Is_Active:
        return jsonify({
            "error": "Account is deactivated. Please contact administrator.",
            "code": "ACCOUNT_DEACTIVATED"
        }), 403

    token = generate_jwt(user)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    return jsonify({"user": request.current_user.to_dict()}), 200

@auth_bp.route('/location', methods=['PUT'])
@token_required
def update_location():
    data = request.get_json() or {}
    user = request.current_user

    city = data.get('city')
    area = data.get('area')
    state = data.get('state', 'Maharashtra')
    lat = data.get('latitude') if 'latitude' in data else data.get('lat')
    lng = data.get('longitude') if 'longitude' in data else data.get('lng')

    if not city or not area:
        return jsonify({"error": "City and area are required", "code": "VALIDATION_ERROR"}), 400

    user.city = city.strip() if isinstance(city, str) else str(city)
    user.area = area.strip() if isinstance(area, str) else str(area)
    user.state = state.strip() if isinstance(state, str) else str(state)
    try:
        if lat is not None:
            user.latitude = float(lat)
        if lng is not None:
            user.longitude = float(lng)
    except (ValueError, TypeError):
        pass

    db.session.commit()
    return jsonify({
        "message": "Location updated successfully",
        "user": user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json() or {}
    user = request.current_user

    if 'name' in data and data['name'].strip():
        user.Name = data['name'].strip()

    if 'address' in data:
        user.Address = data['address'].strip()

    if 'city' in data:
        user.city = data['city']
    if 'area' in data:
        user.area = data['area']
    if 'state' in data:
        user.state = data['state']
    if 'latitude' in data:
        user.latitude = float(data['latitude']) if data['latitude'] is not None else None
    if 'longitude' in data:
        user.longitude = float(data['longitude']) if data['longitude'] is not None else None

    if 'contact' in data and data['contact'].strip():
        contact = data['contact'].strip()
        if not re.match(PHONE_REGEX, contact):
            return jsonify({"error": "Contact number must be exactly 10 digits", "code": "INVALID_CONTACT"}), 422
        existing = User.query.filter(User.Contact == contact, User.User_ID != user.User_ID).first()
        if existing:
            return jsonify({"error": "Contact number is already in use by another account", "code": "DUPLICATE_CONTACT"}), 409
        user.Contact = contact

    if 'password' in data and data['password']:
        if len(data['password']) < 8:
            return jsonify({"error": "Password must be at least 8 characters long", "code": "WEAK_PASSWORD"}), 422
        user.Password_Hash = hash_password(data['password'])

    db.session.commit()
    return jsonify({
        "message": "Profile updated successfully",
        "user": user.to_dict()
    }), 200
