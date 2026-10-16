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

def notify_admins(message: str, channel: str = 'in_app', center_id: int = None) -> list:
    """
    Sends a notification to administrators.
    If center_id is provided, only sends to owners/admins belonging to that center.
    """
    query = User.query.filter(User.Role.in_(['admin', 'center']), User.Is_Active == True)
    if center_id is not None:
        query = query.filter(User.center_id == center_id)
    else:
        # Platform level notification only
        query = query.filter(User.Role == 'platform_admin')

    recipients = query.all()
    created = []
    for u in recipients:
        notif = send_notification(u.User_ID, message, channel=channel)
        created.append(notif)
    return created

def notify_center_admins(center_id: int, message: str, channel: str = 'in_app') -> list:
    """
    Sends a notification only to the admins/owner of the specified center.
    """
    if not center_id:
        return []
    return notify_admins(message=message, channel=channel, center_id=center_id)

def notify_user(user_id: int, message: str, channel: str = 'in_app') -> Notification:
    return send_notification(user_id, message, channel=channel)
