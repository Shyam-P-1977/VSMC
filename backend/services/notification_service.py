from extensions import db
from models import Notification, User

def send_notification(user_id: int, message: str, channel: str = 'in_app') -> Notification:
    """
    Creates an in-app notification and simulates SMS/Email delivery if channel is specified.
    """
    notif = Notification(
        User_ID=user_id,
        Message=message,
        Channel=channel,
        Is_Read=False
    )
    db.session.add(notif)
    if channel in ['sms', 'email']:
        print(f"[MOCK {channel.upper()} SENT to User #{user_id}]: {message}")
    return notif

def notify_admins(message: str, channel: str = 'in_app') -> list:
    """
    Sends a notification to all active system administrators.
    """
    admins = User.query.filter_by(Role='admin', Is_Active=True).all()
    created = []
    for admin in admins:
        notif = send_notification(admin.User_ID, message, channel=channel)
        created.append(notif)
    return created

def notify_user(user_id: int, message: str, channel: str = 'in_app') -> Notification:
    return send_notification(user_id, message, channel=channel)
