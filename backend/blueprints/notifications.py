from flask import Blueprint, jsonify, request

from extensions import db
from models import Notification
from utils import ApiError, current_user, get_or_404, paginate, role_required

bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@bp.get("")
@role_required()
def list_notifications():
    user = current_user()
    q = Notification.query.filter_by(user_id=user.id, channel="in_app")
    if request.args.get("unread") == "1":
        q = q.filter_by(is_read=False)
    unread = Notification.query.filter_by(user_id=user.id, channel="in_app", is_read=False).count()
    q = q.order_by(Notification.created_at.desc(), Notification.id.desc())
    return jsonify(paginate(q, lambda n: n.to_dict(), default_per_page=30, extra={"unread_count": unread}))


@bp.put("/read-all")
@role_required()
def read_all():
    Notification.query.filter_by(user_id=current_user().id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read", "unread_count": 0})


@bp.put("/<int:nid>/read")
@role_required()
def mark_read(nid):
    n = get_or_404(Notification, nid, "Notification")
    if n.user_id != current_user().id:
        raise ApiError("You do not have access to this notification", 403, "forbidden")
    n.is_read = True
    db.session.commit()
    return jsonify(n.to_dict())
