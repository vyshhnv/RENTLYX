from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('accepted',  'Accepted'),
        ('rejected',  'Rejected'),
        ('cancelled', 'Cancelled'),
        ('refunded',  'Refunded'),
    ]

    property = models.ForeignKey(
        'app1.Properties',
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    # Price snapshot at time of booking
    property_price = models.DecimalField(max_digits=12, decimal_places=2)   # full price
    token_amount   = models.DecimalField(max_digits=10, decimal_places=2)   # 5% of property_price

    # Razorpay IDs
    razorpay_order_id   = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature  = models.CharField(max_length=255, blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # Buyer contact (snapshot so seller can see regardless of user edits)
    user_name    = models.CharField(max_length=100, blank=True)
    user_phone   = models.CharField(max_length=15,  blank=True)
    user_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()   # 48 hrs from creation, set in view
    payment_confirmed_at = models.DateTimeField(null=True, blank=True)  # When payment was verified

    def is_expired(self):
        return self.status == 'pending' and timezone.now() > self.expires_at

    def remaining_amount(self):
        """Amount buyer still owes after token deduction"""
        return self.property_price - self.token_amount

    def __str__(self):
        return f"Booking #{self.id} – {self.property.name} by {self.user.username}"

    class Meta:
        ordering = ['-created_at']
        # Production indexes for performance
        indexes = [
            models.Index(fields=['property', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['razorpay_order_id']),
            models.Index(fields=['created_at']),
        ]
        # Prevent duplicate active bookings
        constraints = [
            models.UniqueConstraint(
                fields=['property'],
                condition=models.Q(status='accepted'),
                name='unique_accepted_booking_per_property'
            )
        ]