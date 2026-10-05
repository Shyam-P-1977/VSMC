"""Shared helpers: errors, validation, pagination, RBAC decorators."""
import functools
import re
from datetime import date, datetime

from flask import g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from extensions import db
from models import User


class ApiError(Exception):
    def __init__(self, message, status=400, code="bad_request", **extra):
        super().__init__(message)
        self.message, self.status, self.code, self.extra = message, status, code, extra

    def to_response(self):
        body = {"error": self.message, "code": self.code}
        body.update(self.extra)
        return body, self.status


def validation_error(message, field=None):
    extra = {"field": field} if field else {}
    return ApiError(message, 422, "validation_error", **extra)


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object", 400, "invalid_json")
    return data


def clean_str(data, key, label=None, required=True, max_len=200, min_len=1):
    label = label or key
    v = data.get(key)
    if v is None or (isinstance(v, str) and not v.strip()):
        if required:
            raise validation_error(f"{label} is required", key)
        return None
    if not isinstance(v, str):
        raise validation_error(f"{label} must be text", key)
    v = " ".join(v.split()) if max_len <= 200 else v.strip()
    if len(v) < min_len:
        raise validation_error(f"{label} must be at least {min_len} characters", key)
    if len(v) > max_len:
        raise validation_error(f"{label} must be at most {max_len} characters", key)
    return v


def to_number(data, key, label=None, minimum=None, maximum=None, integer=False, required=True, default=None):
    label = label or key
    v = data.get(key)
    if v is None or v == "":
        if required:
            raise validation_error(f"{label} is required", key)
        return default
    try:
        if isinstance(v, bool):
            raise ValueError
        num = int(v) if integer and float(v) == int(float(v)) else float(v)
        if integer and not isinstance(num, int):
            raise ValueError
    except (TypeError, ValueError):
        raise validation_error(f"{label} must be a valid {'whole number' if integer else 'number'}", key)
    if minimum is not None and num < minimum:
        raise validation_error(f"{label} must be at least {minimum}", key)
    if maximum is not None and num > maximum:
        raise validation_error(f"{label} must be at most {maximum}", key)
    return num


EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
CONTACT_RE = re.compile(r"^\d{10}$")
REG_RE = re.compile(r"^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$")


def validate_email(v):
    v = (v or "").strip().lower()
    if not EMAIL_RE.match(v) or len(v) > 160:
        raise validation_error("Enter a valid email address", "email")
    return v


def validate_contact(v):
    v = re.sub(r"[\s\-]", "", str(v or ""))
    if not CONTACT_RE.match(v):
        raise validation_error("Contact number must be exactly 10 digits", "contact")
    return v


def validate_password(v):
    if not isinstance(v, str) or len(v) < 8:
        raise validation_error("Password must be at least 8 characters", "password")
    if len(v) > 128:
        raise validation_error("Password is too long", "password")
    return v


def normalize_reg(v):
    return re.sub(r"[\s\-]", "", str(v or "")).upper()


def validate_reg(v):
    n = normalize_reg(v)
    if not REG_RE.match(n):
        raise validation_error("Enter a valid registration number (e.g. MH12AB1234)", "registration_number")
    return n


def parse_date(v, field="date", required=True):
    if not v:
        if required:
            raise validation_error(f"{field} is required (YYYY-MM-DD)", field)
        return None
    try:
        return datetime.strptime(v, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise validation_error(f"{field} must be in YYYY-MM-DD format", field)


def paginate(query, serialize, default_per_page=20, max_per_page=200, extra=None):
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", default_per_page)), 1), max_per_page)
    except ValueError:
        raise validation_error("page and per_page must be integers")
    total = query.count()
    rows = query.limit(per_page).offset((page - 1) * per_page).all()
    body = {"items": [serialize(r) for r in rows], "total": total, "page": page,
            "per_page": per_page, "pages": max((total + per_page - 1) // per_page, 1)}
    if extra:
        body.update(extra)
    return body


def role_required(*roles):
    """Require a valid JWT and (optionally) one of the given roles. Sets g.user."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = db.session.get(User, int(get_jwt_identity()))
            if not user or not user.is_active:
                raise ApiError("Account not found or deactivated", 401, "unauthorized")
            if roles and user.role not in roles:
                raise ApiError("You do not have permission to perform this action", 403, "forbidden")
            g.user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def current_user():
    return g.user


def get_or_404(model, pk, label=None):
    obj = db.session.get(model, pk)
    if not obj:
        raise ApiError(f"{label or model.__name__} not found", 404, "not_found")
    return obj
