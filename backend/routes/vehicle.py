import re
from flask import Blueprint, request, jsonify
from extensions import db, token_required
from models import Vehicle, Service_Request
from services.tenancy import get_current_center_id

vehicle_bp = Blueprint('vehicle', __name__, url_prefix='/api/vehicles')

def normalize_plate(plate: str) -> str:
    return re.sub(r'[\s\-]+', '', plate or '').upper()

def format_plate(plate: str) -> str:
    raw = (plate or '').strip().upper()
    return re.sub(r'\s+', ' ', raw)

@vehicle_bp.route('', methods=['GET'])
@token_required
def list_vehicles():
    user = request.current_user
    if user.Role == 'platform_admin':
        customer_id = request.args.get('customer_id')
        if customer_id:
            vehicles = Vehicle.query.filter_by(Customer_ID=customer_id).all()
        else:
            vehicles = Vehicle.query.all()
    elif user.Role in ['admin', 'center', 'mechanic']:
        center_id = get_current_center_id(user)
        customer_id = request.args.get('customer_id')
        
        # Scoped to vehicles that have service requests at this center
        q = Vehicle.query.join(
            Service_Request, Service_Request.Vehicle_ID == Vehicle.Vehicle_ID
        ).filter(Service_Request.center_id == center_id)

        if customer_id:
            q = q.filter(Vehicle.Customer_ID == customer_id)

        vehicles = q.distinct().all()
    else:
        # Customer sees their own vehicles
        vehicles = Vehicle.query.filter_by(Customer_ID=user.User_ID).all()

    return jsonify({"vehicles": [v.to_dict() for v in vehicles]}), 200

@vehicle_bp.route('', methods=['POST'])
@token_required
def add_vehicle():
    user = request.current_user
    data = request.get_json() or {}

    reg_raw = data.get('registration_number', '')
    reg_clean = normalize_plate(reg_raw)
    reg_formatted = format_plate(reg_raw) or reg_clean
    make = (data.get('make') or '').strip()
    model = (data.get('model') or '').strip()
    year = data.get('year')
    fuel_type = (data.get('fuel_type') or 'Petrol').strip()
    color = (data.get('color') or 'Classic White').strip()

    if not reg_clean or not make or not model or not year:
        return jsonify({"error": "Registration plate, make, model, and year are required", "code": "VALIDATION_ERROR"}), 400

    try:
        year_int = int(year)
        if year_int < 1980 or year_int > 2030:
            return jsonify({"error": "Vehicle manufacturing year must be between 1980 and 2030", "code": "INVALID_YEAR"}), 422
    except (ValueError, TypeError):
        return jsonify({"error": "Year must be a valid number", "code": "INVALID_YEAR"}), 422

    # Check global registration uniqueness across ALL customers
    existing = Vehicle.query.filter(
        (Vehicle.Registration_Number == reg_clean) | 
        (Vehicle.Registration_Number == reg_formatted)
    ).first()

    if existing:
        # If already registered by this exact customer, return the existing record cleanly
        if existing.Customer_ID == user.User_ID:
            return jsonify({
                "message": "Vehicle is already registered to your account",
                "vehicle": existing.to_dict()
            }), 200
        return jsonify({"error": f"Vehicle with registration '{reg_formatted}' is already registered in the system", "code": "DUPLICATE_REGISTRATION"}), 409

    target_customer_id = user.User_ID
    if user.Role == 'platform_admin' and data.get('customer_id'):
        target_customer_id = data.get('customer_id')

    vehicle = Vehicle(
        Customer_ID=target_customer_id,
        Registration_Number=reg_formatted,
        Make=make,
        Model=model,
        Year=year_int,
        Fuel_Type=fuel_type,
        Color=color
    )
    db.session.add(vehicle)
    db.session.commit()

    return jsonify({
        "message": "Vehicle added successfully",
        "vehicle": vehicle.to_dict()
    }), 201

@vehicle_bp.route('/<int:vehicle_id>', methods=['PUT'])
@token_required
def update_vehicle(vehicle_id):
    user = request.current_user
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found", "code": "NOT_FOUND"}), 404

    if user.Role != 'platform_admin' and vehicle.Customer_ID != user.User_ID:
        return jsonify({"error": "Forbidden: You do not own this vehicle", "code": "FORBIDDEN"}), 403

    data = request.get_json() or {}
    if 'registration_number' in data:
        new_reg = normalize_plate(data['registration_number'])
        if new_reg != vehicle.Registration_Number:
            existing = Vehicle.query.filter(Vehicle.Registration_Number == new_reg, Vehicle.Vehicle_ID != vehicle_id).first()
            if existing:
                return jsonify({"error": f"Vehicle registration '{new_reg}' is already taken", "code": "DUPLICATE_REGISTRATION"}), 409
            vehicle.Registration_Number = new_reg

    if 'make' in data and data['make'].strip():
        vehicle.Make = data['make'].strip()
    if 'model' in data and data['model'].strip():
        vehicle.Model = data['model'].strip()
    if 'year' in data:
        try:
            vehicle.Year = int(data['year'])
        except ValueError:
            pass
    if 'fuel_type' in data and data['fuel_type'].strip():
        vehicle.Fuel_Type = data['fuel_type'].strip()
    if 'color' in data and data['color'].strip():
        vehicle.Color = data['color'].strip()

    db.session.commit()
    return jsonify({
        "message": "Vehicle updated successfully",
        "vehicle": vehicle.to_dict()
    }), 200

@vehicle_bp.route('/<int:vehicle_id>/history', methods=['GET'])
@token_required
def get_vehicle_history(vehicle_id):
    user = request.current_user
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found", "code": "NOT_FOUND"}), 404

    if user.Role == 'platform_admin':
        requests = Service_Request.query.filter_by(Vehicle_ID=vehicle_id).order_by(Service_Request.Created_At.desc()).all()
    elif user.Role in ['admin', 'center', 'mechanic']:
        center_id = get_current_center_id(user)
        # Only jobs done AT THIS CENTER
        requests = Service_Request.query.filter_by(
            Vehicle_ID=vehicle_id, center_id=center_id
        ).order_by(Service_Request.Created_At.desc()).all()

        # If this vehicle has no jobs at this center, and caller is not the owner: 404!
        if not requests and vehicle.Customer_ID != user.User_ID:
            return jsonify({"error": "Vehicle not found in this service center", "code": "NOT_FOUND"}), 404
    else:
        # Customer
        if vehicle.Customer_ID != user.User_ID:
            return jsonify({"error": "Forbidden: You do not own this vehicle", "code": "FORBIDDEN"}), 403
        requests = Service_Request.query.filter_by(Vehicle_ID=vehicle_id).order_by(Service_Request.Created_At.desc()).all()

    return jsonify({
        "vehicle": vehicle.to_dict(),
        "history": [req.to_dict() for req in requests]
    }), 200
