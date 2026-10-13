import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db, hash_password, role_required
from models import User, Mechanic, Vehicle, Service_Request, Spare_Part, Invoice, Contact_Message, Service_Center

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'
PHONE_REGEX = r'^\d{10}$'

@admin_bp.route('/dashboard', methods=['GET'])
@role_required('admin')
def get_dashboard_kpis():
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    user = request.current_user
    center = None
    if user.center_id:
        center = db.session.get(Service_Center, user.center_id)
    if not center and user.owned_centers:
        center = user.owned_centers[0]
    if not center:
        center = Service_Center.query.first()

    req_query = Service_Request.query
    inv_query = Invoice.query
    part_query = Spare_Part.query

    if center:
        req_query = req_query.filter_by(center_id=center.id)
        inv_query = inv_query.filter_by(center_id=center.id)
        part_query = part_query.filter_by(center_id=center.id)

    pending_count = req_query.filter_by(Status='Pending').count()
    active_count = req_query.filter(Service_Request.Status.in_(['Assigned', 'In Progress', 'Awaiting Parts'])).count()
    completed_count = req_query.filter_by(Status='Completed').count()

    # Revenue this month
    monthly_invoices = inv_query.filter(Invoice.Status == 'Paid', Invoice.Created_At >= month_start).all()
    revenue_this_month = sum(inv.Total_Amount for inv in monthly_invoices)

    # Low stock items
    low_stock_count = part_query.filter(Spare_Part.Quantity_In_Stock <= Spare_Part.Min_Threshold).count()

    # Urgent pending requests
    urgent_pending = req_query.filter_by(Status='Pending', Urgency='Urgent').order_by(Service_Request.Created_At.asc()).all()

    # Recent requests
    recent = req_query.order_by(Service_Request.Created_At.desc()).limit(10).all()

    return jsonify({
        "kpis": {
            "pending_requests": pending_count,
            "active_jobs": active_count,
            "completed_jobs": completed_count,
            "revenue_this_month": round(revenue_this_month, 2),
            "low_stock_count": low_stock_count
        },
        "urgent_pending": [r.to_dict(full=False) for r in urgent_pending],
        "recent_bookings": [r.to_dict(full=False) for r in recent],
        "center": center.to_dict() if center else None
    }), 200

@admin_bp.route('/customers', methods=['GET'])
@role_required('admin')
def list_customers():
    search = request.args.get('search', '').strip()
    query = User.query.filter_by(Role='customer')
    if search:
        query = query.filter(
            (User.Name.ilike(f"%{search}%")) |
            (User.Email.ilike(f"%{search}%")) |
            (User.Contact.ilike(f"%{search}%"))
        )
    customers = query.order_by(User.Created_At.desc()).all()

    data = []
    for c in customers:
        item = c.to_dict()
        item["Vehicles"] = [v.to_dict() for v in c.vehicles]
        item["Total_Vehicles"] = len(c.vehicles)
        item["Active_Requests_Count"] = Service_Request.query.filter(
            Service_Request.Customer_ID == c.User_ID,
            Service_Request.Status.in_(['Pending', 'Assigned', 'In Progress', 'Awaiting Parts'])
        ).count()
        data.append(item)

    return jsonify({"customers": data}), 200

@admin_bp.route('/customers', methods=['POST'])
@role_required('admin')
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

@admin_bp.route('/customers/<int:user_id>', methods=['PUT'])
@role_required('admin')
def update_customer(user_id):
    user = db.session.get(User, user_id)
    if not user or user.Role != 'customer':
        return jsonify({"error": "Customer not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        user.Name = data['name'].strip()
    if 'address' in data:
        user.Address = data['address'].strip()
    if 'contact' in data and data['contact'].strip():
        contact = data['contact'].strip()
        existing = User.query.filter(User.Contact == contact, User.User_ID != user.User_ID).first()
        if existing:
            return jsonify({"error": "Contact number already taken", "code": "DUPLICATE_CONTACT"}), 409
        user.Contact = contact

    db.session.commit()
    return jsonify({"message": "Customer updated successfully", "customer": user.to_dict()}), 200

@admin_bp.route('/mechanics', methods=['GET'])
@role_required('admin')
def list_mechanics():
    mechanics = Mechanic.query.all()
    results = []
    for m in mechanics:
        m_dict = m.to_dict()
        m_dict["Active_Jobs_Count"] = Service_Request.query.filter(
            Service_Request.Mechanic_ID == m.Mechanic_ID,
            Service_Request.Status.in_(['Assigned', 'In Progress', 'Awaiting Parts'])
        ).count()
        results.append(m_dict)
    return jsonify({"mechanics": results}), 200

@admin_bp.route('/mechanics', methods=['POST'])
@role_required('admin')
def create_mechanic():
    """
    Admin creates mechanic account with temp password and specialization.
    """
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    contact = data.get('contact', '').strip()
    temp_password = data.get('password', 'Mech@123')
    specialization = data.get('specialization', 'General Mechanic').strip()

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

    user = User(
        Name=name,
        Email=email,
        Contact=contact,
        Password_Hash=hash_password(temp_password),
        Role='mechanic',
        Is_Active=True
    )
    db.session.add(user)
    db.session.flush()

    mechanic = Mechanic(
        User_ID=user.User_ID,
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
@role_required('admin')
def update_mechanic(mechanic_id):
    mechanic = db.session.get(Mechanic, mechanic_id)
    if not mechanic:
        return jsonify({"error": "Mechanic not found", "code": "NOT_FOUND"}), 404

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
    mechanic = db.session.get(Mechanic, mechanic_id)
    if not mechanic:
        return jsonify({"error": "Mechanic not found", "code": "NOT_FOUND"}), 404
    if mechanic.user:
        mechanic.user.Is_Active = False
        mechanic.Is_Available = False
        db.session.commit()
    return jsonify({"message": "Mechanic deactivated", "mechanic": mechanic.to_dict()}), 200

@admin_bp.route('/users/<int:user_id>/active', methods=['PUT'])
@role_required('admin')
def toggle_user_active(user_id):
    """
    Activates or deactivates a user account.
    RULE: A mechanic with active jobs cannot be deactivated or deleted.
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    new_active = bool(data.get('is_active', not user.Is_Active))

    # If deactivating a mechanic, check active jobs
    if not new_active and user.Role == 'mechanic' and user.mechanic_profile:
        active_jobs = Service_Request.query.filter(
            Service_Request.Mechanic_ID == user.mechanic_profile.Mechanic_ID,
            Service_Request.Status.in_(['Assigned', 'In Progress', 'Awaiting Parts'])
        ).count()
        if active_jobs > 0:
            return jsonify({
                "error": f"Cannot deactivate mechanic '{user.Name}' while they have {active_jobs} active job(s). Please reassign or complete jobs first.",
                "code": "MECHANIC_HAS_ACTIVE_JOBS"
            }), 400

    user.Is_Active = new_active
    db.session.commit()

    return jsonify({
        "message": f"User account {'activated' if user.Is_Active else 'deactivated'} successfully",
        "user": user.to_dict()
    }), 200

@admin_bp.route('/contact-messages', methods=['GET'])
@role_required('admin')
def list_contact_messages():
    messages = Contact_Message.query.order_by(Contact_Message.Created_At.desc()).all()
    return jsonify({"messages": [m.to_dict() for m in messages]}), 200
