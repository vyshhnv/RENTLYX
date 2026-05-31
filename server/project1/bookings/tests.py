from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1.models import Properties, Seller
from bookings.models import Booking


class BookingApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.buyer = User.objects.create_user(username="buyer", password="pass1234")
        seller_user = User.objects.create_user(username="seller", password="pass1234")
        seller = Seller.objects.create(
            user=seller_user,
            phone="9999999999",
            address="Kozhikode",
            pan_verified=True,
        )
        self.property = Properties.objects.create(
            seller=seller,
            name="City Center Apartment",
            property_place="Mavoor Road",
            city="Kozhikode",
            purpose="sale",
            property_type="apartment",
            price=5000000,
            bhk="3bhk",
            bathrooms=3,
            built_up_area=1600,
            furnishing="full",
            description="Ready to move in",
            listing_status="approved",
        )

    def test_create_order_returns_503_without_payment_gateway(self):
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(
            "/api/bookings/create-order/",
            {
                "property_id": self.property.id,
                "user_name": "Buyer",
                "user_phone": "8888888888",
                "user_message": "Interested",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn("Payment gateway is unavailable", response.data["error"])

    def test_booking_status_endpoint_returns_preview_amount(self):
        response = self.client.get(f"/api/bookings/property/{self.property.id}/status/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "available")
        self.assertEqual(response.data["token_amount"], "250000.00")

    def test_cancel_booking_gracefully_handles_missing_gateway(self):
        booking = Booking.objects.create(
            property=self.property,
            user=self.buyer,
            property_price=self.property.price,
            token_amount=250000,
            status="accepted",
            user_name="Buyer",
            user_phone="8888888888",
            user_message="Interested",
            expires_at=timezone.now() + timezone.timedelta(hours=48),
        )
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(f"/api/bookings/{booking.id}/cancel/")

        booking.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(booking.status, "cancelled")
        self.assertFalse(response.data["refund_initiated"])
