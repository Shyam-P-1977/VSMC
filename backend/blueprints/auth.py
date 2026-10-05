from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import User
from utils import (ApiError, clean_str, current_user, json_body, role_required, validate_contact,
                   validate_email, validate_password)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _token_payload(user):
    return {"token": create_access_token(identity=str(user.id)), "user": user.to_dict(), "role": user.role}


def ensure_unique(email=None, contact=None, exclude_id=None):
    if email:
        q = User.query.filter(User.email == email)
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        if q.first():
            raise ApiError("An account with this email already exists", 409, "duplicate_email", field="email")
    if contact:
        q = User.query.filter(User.contact == contact)
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        if q.first():
            raise ApiError("An account with this contact number already exists", 409, "duplicate_contact",
                           field="contact")


@bp.post("/register")
def register():
    data = json_body()
    name = clean_str(data, "name", "Name", max_len=120, min_len=2)
    email = validate_email(data.get("email"))
    contact = validate_contact(data.get("contact"))
    password = validate_password(data.get("password"))
    address = clean_str(data, "address", "Address", required=False, max_len=300)
    ensure_unique(email, contact)
    user = User(name=name, email=email, contact=contact, role="customer", address=address)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("An account with this email or contact already exists", 409, "duplicate")
    return jsonify(_token_payload(user)), 201


@bp.post("/login")
def login():
    data = json_body()
    email = str(data.get("email") or "").strip().lower()
    password = data.get("password")
    user = User.query.filter_by(email=email).first()
    # One generic message for every failure mode (BR-5)
    if not user or not isinstance(password, str) or not user.check_password(password) or not user.is_active:
        raise ApiError("Invalid email or password", 401, "invalid_credentials")
    return jsonify(_token_payload(user))


@bp.get("/me")
@role_required()
def me():
    return jsonify({"user": current_user().to_dict()})


@bp.put("/profile")
@role_required()
def update_profile():
    user, data = current_user(), json_body()
    if "name" in data:
        user.name = clean_str(data, "name", "Name", max_len=120, min_len=2)
    if "contact" in data:
        user.contact = validate_contact(data["contact"])
        ensure_unique(contact=user.contact, exclude_id=user.id)
    if "address" in data:
        user.address = clean_str(data, "address", "Address", required=False, max_len=300)
    if data.get("new_password"):
        if not user.check_password(str(data.get("current_password") or "")):
            raise ApiError("Current password is incorrect", 422, "validation_error", field="current_password")
        user.set_password(validate_password(data["new_password"]))
    db.session.commit()
    return jsonify({"user": user.to_dict()})
