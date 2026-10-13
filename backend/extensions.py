import sqlite3
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine
from passlib.hash import bcrypt

db = SQLAlchemy()
cors = CORS()

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def hash_password(password: str) -> str:
    return bcrypt.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.verify(password, hashed_password)
    except Exception:
        return False

def generate_jwt(user, expires_in_hours=8):
    payload = {
        "user_id": user.User_ID,
        "email": user.Email,
        "name": user.Name,
        "role": user.Role,
        "center_id": getattr(user, 'center_id', None),
        "exp": datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

def decode_jwt(token: str):
    try:
        return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization token is missing", "code": "TOKEN_MISSING"}), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid token header format. Use 'Bearer <token>'", "code": "TOKEN_INVALID"}), 401

        payload = decode_jwt(parts[1])
        if not payload:
            return jsonify({"error": "Token is invalid or expired", "code": "TOKEN_EXPIRED"}), 401

        from models import User
        user = db.session.get(User, payload["user_id"])
        if not user:
            return jsonify({"error": "User does not exist", "code": "USER_NOT_FOUND"}), 401
        
        if not user.Is_Active:
            return jsonify({"error": "Account is deactivated. Please contact administrator.", "code": "ACCOUNT_DEACTIVATED"}), 403

        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            user_role = request.current_user.Role
            effective_roles = set(allowed_roles)
            if 'admin' in effective_roles:
                effective_roles.add('center')
            if 'center' in effective_roles:
                effective_roles.add('admin')
            if user_role not in effective_roles:
                return jsonify({"error": f"Permission denied for role '{user_role}'", "code": "FORBIDDEN"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
