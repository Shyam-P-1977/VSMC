from flask import Blueprint, request, jsonify
from extensions import db, token_required
from models import Notification

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notifications')

@notification_bp.route('', methods=['GET'])
@token_required
def get_user_notifications():
    user = request.current_user
    notifications = Notification.query.filter_by(User_ID=user.User_ID).order_by(Notification.Created_At.desc()).all()
    unread_count = Notification.query.filter_by(User_ID=user.User_ID, Is_Read=False).count()
    return jsonify({
        "unread_count": unread_count,
        "notifications": [n.to_dict() for n in notifications]
    }), 200

@notification_bp.route('/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(notification_id):
    user = request.current_user
    notif = db.session.get(Notification, notification_id)
    if not notif or notif.User_ID != user.User_ID:
        return jsonify({"error": "Notification not found", "code": "NOT_FOUND"}), 404

    notif.Is_Read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read", "notification": notif.to_dict()}), 200

@notification_bp.route('/read-all', methods=['PUT'])
@token_required
def mark_all_read():
    user = request.current_user
    Notification.query.filter_by(User_ID=user.User_ID, Is_Read=False).update({"Is_Read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200
