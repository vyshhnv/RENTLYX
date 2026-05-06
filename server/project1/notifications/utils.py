"""
notifications/utils.py
─────────────────────
Import and call create_notification() from anywhere in your Django project
to push a notification to a user. No signals, no complexity.

Usage:
    from notifications.utils import create_notification
    create_notification(
        user    = booking.user,
        type    = 'booking_accepted',
        title   = 'Booking Accepted',
        message = f'Your booking for {booking.property.name} has been accepted.',
        link    = '/my-bookings',
    )
"""

from .models import Notification


def create_notification(user, type, title, message, link=""):
    """Create a notification for a user. Silently skips on error."""
    try:
        Notification.objects.create(
            user=user,
            type=type,
            title=title,
            message=message,
            link=link,
        )
    except Exception as e:
        print(f"[Notification] Failed to create notification: {e}")