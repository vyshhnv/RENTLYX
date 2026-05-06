from django.db import models
from django.contrib.auth.models import User


NOTIFICATION_TYPES = [
    ('booking_received',  'New booking received'),
    ('booking_accepted',  'Booking accepted'),
    ('booking_rejected',  'Booking rejected'),
    ('booking_cancelled', 'Booking cancelled'),
    ('booking_refunded',  'Refund initiated'),
    ('review_received',   'New review on your property'),
    ('complaint_update',  'Complaint status updated'),
    ('message_received',  'New message'),
    ('listing_approved',  'Listing approved'),
    ('listing_rejected',  'Listing rejected'),
]


class Notification(models.Model):
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type         = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title        = models.CharField(max_length=150)
    message      = models.TextField()
    is_read      = models.BooleanField(default=False)
    link         = models.CharField(max_length=200, blank=True)  # frontend route e.g. /my-bookings
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.title}"