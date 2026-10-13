import re
from flask import Blueprint, request, jsonify
from extensions import db
from models import Contact_Message
from services.notification_service import notify_admins

contact_bp = Blueprint('contact', __name__, url_prefix='/api/contact')

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'

@contact_bp.route('', methods=['POST'])
def submit_contact():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip().lower()
    message = data.get('message', '').strip()

    if not name or not phone or not email or not message:
        return jsonify({"error": "All fields (name, phone, email, message) are required", "code": "VALIDATION_ERROR"}), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({"error": "Invalid email address", "code": "INVALID_EMAIL"}), 422

    msg = Contact_Message(
        Name=name,
        Phone=phone,
        Email=email,
        Message=message
    )
    db.session.add(msg)
    db.session.commit()

    notify_admins(f"New contact inquiry from {name} ({phone}, {email}): {message[:60]}...")

    return jsonify({
        "message": "Thank you for reaching out! Our team will contact you shortly.",
        "contact": msg.to_dict()
    }), 201
