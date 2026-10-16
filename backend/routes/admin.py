import re
from datetime import datetime
from flask import Blueprint, request, jsonify, abort
from extensions import db, hash_password, role_required
from models import User, Mechanic, Vehicle, Service_Request, Spare_Part, Invoice, Contact_Message, Service_Center
from services.tenancy import (
    get_current_center_id, scoped_requests, scoped_invoices,
    scoped_parts, scoped_customers, scoped_mechanics, get_or_404_in_center
)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'
PHONE_REGEX = r'^\d{10}$'

@admin_bp.route('/dashboard', methods=['GET'])
@role_required('admin', 'center')
def get_dashboard_kpis():
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    user = request.current_user
    center_id = get_current_center_id(user)
    center = db.session.get(Service_Center, center_id)
    if not center:
        return jsonify({"error": "Service center not found", "code": "NOT_FOUND"}), 404

    req_query = scoped_requests(center_id)
    inv_query = scoped_invoices(center_id)
    part_query = scoped_parts(center_id)

    pending_count = req_query.filter(Service_Request.Status.in_(['Pending', 'Pending Approval'])).count()
    active_count = req_query.filter(Service_Request.Status.in_(['Assigned', 'In Progress', 'Awaiting Parts'])).count()
    completed_count = req_query.filter(Service_Request.Status.in_(['Completed', 'Done'])).count()

    # Revenue this month
    monthly_invoices = inv_query.filter(Invoice.Status == 'Paid', Invoice.Created_At >= month_start).all()
    revenue_this_month = sum(inv.Total_Amount for inv in monthly_invoices)

    # Low stock and Out of stock items (active only)
    out_of_stock_count = part_query.filter(Spare_Part.is_active == True, Spare_Part.Quantity_In_Stock == 0).count()
    low_stock_count = part_query.filter(Spare_Part.is_active == True, Spare_Part.Quantity_In_Stock > 0, Spare_Part.Quantity_In_Stock < Spare_Part.Min_Threshold).count()

    # Low stock alerts list (out of stock first, then low stock)
    low_stock_parts = part_query.filter(
        Spare_Part.is_active == True,
        Spare_Part.Quantity_In_Stock < Spare_Part.Min_Threshold
    ).order_by(Spare_Part.Quantity_In_Stock.asc()).limit(10).all()

    # Urgent pending requests
    urgent_pending = req_query.filter(Service_Request.Status.in_(['Pending', 'Pending Approval']), Service_Request.Urgency == 'Urgent').order_by(Service_Request.Created_At.asc()).all()

    # Recent requests
    recent = req_query.order_by(Service_Request.Created_At.desc()).limit(10).all()

    return jsonify({
        "kpis": {
            "pending_requests": pending_count,
            "active_jobs": active_count,
            "completed_jobs": completed_count,
            "revenue_this_month": round(revenue_this_month, 2),
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "total_low_or_out": low_stock_count + out_of_stock_count
        },
        "low_stock_parts": [p.to_dict() for p in low_stock_parts],
        "urgent_pending": [r.to_dict(full=False) for r in urgent_pending],
        "recent_bookings": [r.to_dict(full=False) for r in recent],
        "center": center.to_dict()
    }), 200

@admin_bp.route('/customers', methods=['GET'])
@role_required('admin', 'center')
def list_customers():
    """
    Returns only customers who have at least one booking at this center.
    Never exposes customers from other centers.
    """
    user = request.current_user
    center_id = get_current_center_id(user)
    search = request.args.get('search', '').strip()
    
    query = scoped_customers(center_id)
    if search:
        query = query.filter(
            (User.Name.ilike(f"%{search}%")) |
            (User.Contact.ilike(f"%{search}%"))
        )
    customers = query.order_by(User.Created_At.desc()).all()

    data = []
    for c in customers:
        # Only vehicles booked at THIS center
        booked_vehicle_ids = db.session.query(Service_Request.Vehicle_ID).filter(
            Service_Request.Customer_ID == c.User_ID,
            Service_Request.center_id == center_id
        ).distinct()
        vehicles = Vehicle.query.filter(Vehicle.Vehicle_ID.in_(booked_vehicle_ids)).all()
        
        active_requests_count = Service_Request.query.filter(
            Service_Request.Customer_ID == c.User_ID,
            Service_Request.center_id == center_id,
            Service_Request.Status.in_(['Pending', 'Pending Approval', 'Assigned', 'In Progress', 'Awaiting Parts'])
        ).count()

        item = {
            "User_ID": c.User_ID,
            "Name": c.Name,
            "Email": c.Email,
            "Contact": c.Contact,
            "Address": c.Address,
            "Is_Active": c.Is_Active if hasattr(c, 'Is_Active') else True,
            "Role": c.Role,
            "Created_At": c.Created_At.isoformat() if c.Created_At else None,
            "Vehicles": [v.to_dict() for v in vehicles],
            "Total_Vehicles": len(vehicles),
            "Active_Requests_Count": active_requests_count
        }
        data.append(item)

    return jsonify({"customers": data}), 200

@admin_bp.route('/customers', methods=['POST'])
@role_required('admin', 'center')
def create_customer():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    contact = data.get('contact', '').strip()
    password = data.get('password', 'Customer@123')
    address = data.get('address', '').strip()

    if not name or not email or not contact:
        return jsonify({"error": "Name, email, and contact number are required", "code": "VALIDATION_ERROR"}), 400

    if User.query.filter_by(Email=email).first():
        return jsonify({"error": "Email is already registered", "code": "DUPLICATE_EMAIL"}), 409

    if User.query.filter_by(Contact=contact).first():
        return jsonify({"error": "Contact number is already registered", "code": "DUPLICATE_CONTACT"}), 409

    user = User(
        Name=name,
        Email=email,
        Contact=contact,
        Password_Hash=hash_password(password),
        Role='customer',
        Address=address,
        Is_Active=True
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Customer created successfully", "customer": user.to_dict()}), 201

@admin_bp.route('/customers/<int:user_id>', methods=['GET'])
@role_required('admin', 'center')
def get_customer_detail(user_id):
    """
    Returns customer details only if the customer has a booking at caller's center.
    Returns 404 otherwise.
    """
    user = request.current_user
    center_id = get_current_center_id(user)
    customer = get_or_404_in_center(User, user_id, center_id)

    # Scoped vehicle and bookings
    booked_vehicle_ids = db.session.query(Service_Request.Vehicle_ID).filter(
        Service_Request.Customer_ID == customer.User_ID,
        Service_Request.center_id == center_id
    ).distinct()
    vehicles = Vehicle.query.filter(Vehicle.Vehicle_ID.in_(booked_vehicle_ids)).all()

    requests = Service_Request.query.filter(
        Service_Request.Customer_ID == customer.User_ID,
        Service_Request.center_id == center_id
    ).order_by(Service_Request.Created_At.desc()).all()

    return jsonify({
        "customer": {
            "User_ID": customer.User_ID,
            "Name": customer.Name,
            "Contact": customer.Contact,
            "Role": customer.Role,
            "Vehicles": [v.to_dict() for v in vehicles],
            "Requests": [r.to_dict(full=False) for r in requests]
        }
    }), 200

@admin_bp.route('/customers/<int:user_id>', methods=['PUT'])
@role_required('admin', 'center')
def update_customer(user_id):
    user = request.current_user
    center_id = get_current_center_id(user)
    customer = get_or_404_in_center(User, user_id, center_id)

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        customer.Name = data['name'].strip()
    if 'address' in data:
        customer.Address = data['address'].strip()
    if 'contact' in data and data['contact'].strip():
        contact = data['contact'].strip()
        existing = User.query.filter(User.Contact == contact, User.User_ID != customer.User_ID).first()
        if existing:
            return jsonify({"error": "Contact number already taken", "code": "DUPLICATE_CONTACT"}), 409
        customer.Contact = contact

    db.session.commit()
    return jsonify({
        "message": "Customer updated successfully",
        "customer": {
            "User_ID": customer.User_ID,
            "Name": customer.Name,
            "Contact": customer.Contact,
            "Role": customer.Role
        }
    }), 200

@admin_bp.route('/mechanics', methods=['GET'])
@role_required('admin', 'center')
def list_mechanics():
    user = request.current_user
    center_id = get_current_center_id(user)
    mechanics = scoped_mechanics(center_id).all()

    results = []
    for m in mechanics:
        m_dict = m.to_dict()
        m_dict["Active_Jobs_Count"] = Service_Request.query.filter(
            Service_Request.Mechanic_ID == m.Mechanic_ID,
            Service_Request.center_id == center_id,
            Service_Request.Status.in_(['Assigned', 'In Progress', 'Awaiting Parts'])
        ).count()
        results.append(m_dict)
    return jsonify({"mechanics": results}), 200

@admin_bp.route('/mechanics', methods=['POST'])
@role_required('admin', 'center')
def create_mechanic():
    """
    Center manager creates mechanic account for their own workshop.
    """
    user = request.current_user
    center_id = get_current_center_id(user)

    data = request.get_json() or {}
    name = (data.get('name') or data.get('Name') or '').strip()
    email = (data.get('email') or data.get('Email') or '').strip().lower()
    contact = (data.get('contact') or data.get('Contact') or '').strip()
    temp_password = data.get('password') or data.get('Password') or 'Mech@123'
    specialization = (data.get('specialization') or data.get('Specialization') or 'General Mechanic').strip()

    if not name or not email or not contact:
        return jsonify({"error": "Name, email, and contact are required", "code": "VALIDATION_ERROR"}), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({"error": "Invalid email address format", "code": "INVALID_EMAIL"}), 422

    if not re.match(PHONE_REGEX, contact):
        return jsonify({"error": "Contact number must be 10 digits", "code": "INVALID_CONTACT"}), 422

    if User.query.filter_by(Email=email).first():
        return jsonify({"error": "An account with this email already exists", "code": "DUPLICATE_EMAIL"}), 409

    if User.query.filter_by(Contact=contact).first():
        return jsonify({"error": "An account with this contact number already exists", "code": "DUPLICATE_CONTACT"}), 409

    user_obj = User(
        Name=name,
        Email=email,
        Contact=contact,
        Password_Hash=hash_password(temp_password),
        Role='mechanic',
        center_id=center_id,
        Is_Active=True
    )
    db.session.add(user_obj)
    db.session.flush()

    mechanic = Mechanic(
        User_ID=user_obj.User_ID,
        center_id=center_id,
        Specialization=specialization,
        Is_Available=True
    )
    db.session.add(mechanic)
    db.session.commit()

    return jsonify({
        "message": "Mechanic account created successfully",
        "mechanic": mechanic.to_dict()
    }), 201

@admin_bp.route('/mechanics/<int:mechanic_id>', methods=['PUT'])
@role_required('admin', 'center')
def update_mechanic(mechanic_id):
    user = request.current_user
    center_id = get_current_center_id(user)
    mechanic = get_or_404_in_center(Mechanic, mechanic_id, center_id)

    data = request.get_json() or {}
    if 'specialization' in data:
        mechanic.Specialization = data['specialization'].strip()
    if 'is_available' in data:
        mechanic.Is_Available = bool(data['is_available'])

    if mechanic.user:
        if 'name' in data and data['name'].strip():
            mechanic.user.Name = data['name'].strip()
        if 'contact' in data and data['contact'].strip():
            contact = data['contact'].strip()
            existing = User.query.filter(User.Contact == contact, User.User_ID != mechanic.user.User_ID).first()
            if existing:
                return jsonify({"error": "Contact number already taken", "code": "DUPLICATE_CONTACT"}), 409
            mechanic.user.Contact = contact

    db.session.commit()
    return jsonify({"message": "Mechanic updated successfully", "mechanic": mechanic.to_dict()}), 200

@admin_bp.route('/mechanics/<int:mechanic_id>/deactivate', methods=['PUT'])
@role_required('admin', 'center')
def deactivate_mechanic(mechanic_id):
    user = request.current_user
    center_id = get_current_center_id(user)
    mechanic = get_or_404_in_center(Mechanic, mechanic_id, center_id)

    if mechanic.user:
        mechanic.user.Is_Active = False
        mechanic.Is_Available = False
        db.session.commit()
    return jsonify({"message": "Mechanic deactivated", "mechanic": mechanic.to_dict()}), 200

@admin_bp.route('/users/<int:user_id>/active', methods=['PUT'])
@role_required('admin', 'center')
def toggle_user_active(user_id):
    """
    Activates or deactivates a user account belonging to this center.
    """
    user = request.current_user
    center_id = get_current_center_id(user)

    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({"error": "User not found", "code": "NOT_FOUND"}), 404

    # Check center association
    if target_user.center_id != center_id:
        return jsonify({"error": "User not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    new_active = bool(data.get('is_active', not target_user.Is_Active))

    if not new_active and target_user.Role == 'mechanic' and target_user.mechanic_profile:
        active_jobs = Service_Request.query.filter(
            Service_Request.Mechanic_ID == target_user.mechanic_profile.Mechanic_ID,
            Service_Request.center_id == center_id,
            Service_Request.Status.in_(['Assigned', 'In Progress', 'Awaiting Parts'])
        ).count()
        if active_jobs > 0:
            return jsonify({
                "error": f"Cannot deactivate mechanic '{target_user.Name}' while they have {active_jobs} active job(s). Please reassign or complete jobs first.",
                "code": "MECHANIC_HAS_ACTIVE_JOBS"
            }), 400

    target_user.Is_Active = new_active
    db.session.commit()

    return jsonify({
        "message": f"User account {'activated' if target_user.Is_Active else 'deactivated'} successfully",
        "user": target_user.to_dict()
    }), 200

@admin_bp.route('/contact-messages', methods=['GET'])
@role_required('admin', 'center')
def list_contact_messages():
    # Service center admins only receive contact messages (or return empty for center)
    return jsonify({"messages": []}), 200
