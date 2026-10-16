"""
Tenancy and Data Isolation Service for VSCMS
Provides strict server-side multi-tenant scoping, deny-by-default queries,
and tenant object lookup with 404-on-mismatch semantics.
"""
from functools import wraps
from flask import request, jsonify, abort
from extensions import db
from models import (
    User, Service_Center, Service_Request, Invoice, Payment,
    Time_Slot, Spare_Part, Mechanic, Center_Service, Request_Attachment,
    Notification
)

def get_current_center_id(user=None) -> int:
    """
    Returns the center_id for the logged-in center, mechanic, or legacy admin user.
    If the user has role 'center', 'mechanic', or 'admin' and no valid center_id
    can be resolved, this raises a 403 FORBIDDEN HTTP exception.
    It NEVER falls back to a default center and NEVER returns None for tenant users.
    
    For platform_admin, returns the center_id passed in query params (if any), or None.
    """
    if user is None:
        user = getattr(request, 'current_user', None)

    if not user:
        abort(401, description="Authentication required")

    role = user.Role

    if role == 'platform_admin':
        param = request.args.get('center_id', type=int)
        return param

    if role in ('center', 'admin'):
        if user.center_id:
            return int(user.center_id)
        if hasattr(user, 'owned_centers') and user.owned_centers:
            return int(user.owned_centers[0].id)
        if hasattr(user, 'owned_center') and user.owned_center:
            return int(user.owned_center.id)
        abort(403, description="Forbidden: User is not associated with any active service center")

    if role == 'mechanic':
        if user.center_id:
            return int(user.center_id)
        if hasattr(user, 'mechanic_profile') and user.mechanic_profile and user.mechanic_profile.center_id:
            return int(user.mechanic_profile.center_id)
        abort(403, description="Forbidden: Mechanic is not assigned to a service center")

    if role == 'customer':
        return None

    abort(403, description=f"Forbidden: Role '{role}' cannot access center resources")


def center_scoped(f):
    """
    Decorator that guarantees the request is authenticated and belongs to a valid center.
    Injects `center_id` as a keyword argument to the decorated function if accepted,
    or attaches it to `request.center_id`.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user = getattr(request, 'current_user', None)
        if not user:
            return jsonify({"error": "Authorization required", "code": "UNAUTHORIZED"}), 401
        
        try:
            cid = get_current_center_id(user)
        except Exception as e:
            return jsonify({"error": str(e), "code": "FORBIDDEN"}), 403

        if cid is None and user.Role != 'platform_admin':
            return jsonify({"error": "Forbidden: No center associated with this user", "code": "FORBIDDEN"}), 403

        request.center_id = cid
        return f(*args, **kwargs)
    return decorated


# ==============================================================================
# SCOPED QUERY HELPERS (Strict Center Scoping)
# ==============================================================================

def scoped_requests(center_id: int = None, user=None):
    """
    Returns Service_Request query strictly filtered to the given center_id.
    If the caller is a mechanic, further restricts to requests assigned to them.
    """
    if center_id is None:
        center_id = get_current_center_id(user)
    if user is None:
        user = getattr(request, 'current_user', None)

    q = Service_Request.query.filter(Service_Request.center_id == center_id)

    if user and user.Role == 'mechanic':
        mech_id = user.mechanic_profile.Mechanic_ID if getattr(user, 'mechanic_profile', None) else None
        if not mech_id:
            return q.filter(db.false())
        q = q.filter(Service_Request.Mechanic_ID == mech_id)

    return q


def scoped_invoices(center_id: int = None):
    """
    Returns Invoice query strictly filtered to the given center_id.
    Ensures join with Service_Request to guarantee integrity.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Invoice.query.filter(Invoice.center_id == center_id)


def scoped_payments(center_id: int = None):
    """
    Returns Payment query strictly filtered to payments whose invoice belongs to the center.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Payment.query.join(Invoice, Payment.Invoice_ID == Invoice.Invoice_ID).filter(Invoice.center_id == center_id)


def scoped_customers(center_id: int = None):
    """
    Returns User (role 'customer') query strictly filtered to customers
    who have at least ONE booking at this center.
    """
    if center_id is None:
        center_id = get_current_center_id()
    
    # Customer IDs that have requests at this center
    customer_ids_subquery = db.session.query(Service_Request.Customer_ID).filter(
        Service_Request.center_id == center_id
    ).distinct()

    return User.query.filter(
        User.Role == 'customer',
        User.User_ID.in_(customer_ids_subquery)
    )


def scoped_parts(center_id: int = None):
    """
    Returns Spare_Part query strictly filtered to parts belonging to the center.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Spare_Part.query.filter(Spare_Part.center_id == center_id)


def scoped_mechanics(center_id: int = None):
    """
    Returns Mechanic query strictly filtered to mechanics of this center.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Mechanic.query.filter(Mechanic.center_id == center_id)


def scoped_slots(center_id: int = None):
    """
    Returns Time_Slot query strictly filtered to slots of this center.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Time_Slot.query.filter(Time_Slot.center_id == center_id)


def scoped_services(center_id: int = None):
    """
    Returns Center_Service query strictly filtered to services configured for this center.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Center_Service.query.filter(Center_Service.center_id == center_id)


def scoped_attachments(center_id: int = None):
    """
    Returns Request_Attachment query filtered through Service_Request.center_id.
    """
    if center_id is None:
        center_id = get_current_center_id()
    return Request_Attachment.query.join(
        Service_Request, Request_Attachment.Request_ID == Service_Request.Request_ID
    ).filter(Service_Request.center_id == center_id)


def scoped_notifications(user=None):
    """
    Returns Notification query strictly filtered to the user's own User_ID.
    """
    if user is None:
        user = getattr(request, 'current_user', None)
    if not user:
        abort(401, description="Authentication required")
    return Notification.query.filter(Notification.User_ID == user.User_ID)


# ==============================================================================
# SAFE OBJECT FETCHER: get_or_404_in_center
# ==============================================================================

def get_or_404_in_center(model_cls, ident: int, center_id: int = None):
    """
    Fetches an entity by ID ensuring it strictly belongs to the caller's center.
    If the record does not exist OR belongs to another center, raises a 404 NOT FOUND.
    (Never 403, so that existence of other centers' IDs is never revealed).
    """
    if center_id is None:
        center_id = get_current_center_id()

    # Route based on model class
    if model_cls == Service_Request:
        obj = Service_Request.query.filter(
            Service_Request.Request_ID == ident,
            Service_Request.center_id == center_id
        ).first()

    elif model_cls == Invoice:
        obj = Invoice.query.filter(
            Invoice.Invoice_ID == ident,
            Invoice.center_id == center_id
        ).first()

    elif model_cls == Payment:
        obj = Payment.query.join(Invoice, Payment.Invoice_ID == Invoice.Invoice_ID).filter(
            Payment.Payment_ID == ident,
            Invoice.center_id == center_id
        ).first()

    elif model_cls == Spare_Part:
        obj = Spare_Part.query.filter(
            Spare_Part.Part_ID == ident,
            Spare_Part.center_id == center_id
        ).first()

    elif model_cls == Mechanic:
        obj = Mechanic.query.filter(
            Mechanic.Mechanic_ID == ident,
            Mechanic.center_id == center_id
        ).first()

    elif model_cls == Time_Slot:
        obj = Time_Slot.query.filter(
            Time_Slot.Slot_ID == ident,
            Time_Slot.center_id == center_id
        ).first()

    elif model_cls == Center_Service:
        obj = Center_Service.query.filter(
            Center_Service.id == ident,
            Center_Service.center_id == center_id
        ).first()

    elif model_cls == Request_Attachment:
        obj = Request_Attachment.query.join(
            Service_Request, Request_Attachment.Request_ID == Service_Request.Request_ID
        ).filter(
            Request_Attachment.Attachment_ID == ident,
            Service_Request.center_id == center_id
        ).first()

    elif model_cls == User:
        # For customer detail lookup in center context:
        # Customer must have at least one booking at this center!
        has_booking = db.session.query(Service_Request.Request_ID).filter(
            Service_Request.Customer_ID == ident,
            Service_Request.center_id == center_id
        ).first()
        if not has_booking:
            abort(404, description="Customer not found in this service center")
        obj = db.session.get(User, ident)

    elif model_cls == Service_Center:
        if ident != center_id:
            abort(404, description="Service center not found")
        obj = db.session.get(Service_Center, ident)

    else:
        # Generic fallback if model has center_id
        if hasattr(model_cls, 'center_id'):
            obj = model_cls.query.filter(
                getattr(model_cls, model_cls.__table__.primary_key.columns.keys()[0]) == ident,
                model_cls.center_id == center_id
            ).first()
        else:
            abort(404, description=f"{model_cls.__name__} not found")

    if not obj:
        abort(404, description=f"{model_cls.__name__} not found")

    return obj
