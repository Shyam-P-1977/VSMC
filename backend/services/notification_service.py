"""Mock SMS / Email notification service.

Always writes an in-app notification row. When sms/email is requested a delivery-log
row is stored too and a "sent" line is logged to the console. Nothing is really sent.
Callers are responsible for committing the session.
"""
import logging

from extensions import db
from models import Notification, User

log = logging.getLogger("vscms.notify")


def notify(user_id, message, sms=False, email=False):
    user = db.session.get(User, user_id)
    if not user:
        return
    db.session.add(Notification(user_id=user_id, message=message, channel="in_app"))
    if sms:
        log.info("SMS sent to %s: %s", user.contact, message)
        db.session.add(Notification(user_id=user_id, message=message, channel="sms", is_read=True))
    if email:
        log.info("Email sent to %s: %s", user.email, message)
        db.session.add(Notification(user_id=user_id, message=message, channel="email", is_read=True))


def notify_admins(message):
    for admin in User.query.filter_by(role="admin", is_active=True).all():
        notify(admin.id, message)
