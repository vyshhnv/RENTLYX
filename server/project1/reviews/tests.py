from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1.models import Properties, Seller
from bookings.models import Booking
from reviews.models import PropertyReview


class ReviewApiTests(TestCase):
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
            name="Lake View Villa",
            property_place="Chevayur",
            city="Kozhikode",
            purpose="rent",
            property_type="villa",
            price=45000,
            bhk="3bhk",
            bathrooms=3,
            built_up_area=1900,
            furnishing="full",
            description="Spacious family villa",
            listing_status="approved",
        )
        self.booking = Booking.objects.create(
            property=self.property,
            user=self.buyer,
            property_price=self.property.price,
            token_amount=2250,
            status="accepted",
            user_name="Buyer",
            user_phone="8888888888",
            user_message="Interested",
            expires_at=timezone.now() + timezone.timedelta(hours=48),
        )

    def test_submit_review_with_eligible_booking(self):
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(
            "/api/reviews/submit/",
            {
                "property_id": self.property.id,
                "booking_id": self.booking.id,
                "rating": 5,
                "comment": "Excellent stay",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PropertyReview.objects.count(), 1)

    def test_my_reviews_returns_property_keyed_payload(self):
        review = PropertyReview.objects.create(
            property=self.property,
            user=self.buyer,
            booking=self.booking,
            rating=4,
            comment="Very good",
        )
        self.client.force_authenticate(user=self.buyer)

        response = self.client.get("/api/reviews/my/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(str(self.property.id), response.data)
        self.assertEqual(response.data[str(self.property.id)]["id"], review.id)
