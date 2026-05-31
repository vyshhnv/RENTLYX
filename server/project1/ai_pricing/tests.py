from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from app1.models import Properties, Seller


class AiPricingApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        seller_user = User.objects.create_user(username="seller", password="pass1234")
        seller = Seller.objects.create(
            user=seller_user,
            phone="9999999999",
            address="Kozhikode",
            pan_verified=True,
        )
        Properties.objects.create(
            seller=seller,
            name="Beach View Flat",
            property_place="Nadakkavu",
            city="Kozhikode",
            purpose="rent",
            property_type="flat",
            price=25000,
            bhk="2bhk",
            bathrooms=2,
            built_up_area=1200,
            furnishing="semi",
            description="Close to the beach and city center",
            listing_status="approved",
        )

    def test_model_info_endpoint_returns_ok(self):
        response = self.client.get("/api/ai/model-info/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertIn("chat_backend", response.data)

    @patch("ai_pricing.views.find_matching_properties")
    @patch("ai_pricing.views.build_llm_answer", return_value="Recommended property response")
    def test_ask_endpoint_returns_response(self, mocked_answer, mocked_matches):
        mocked_matches.return_value = [{"name": "Beach View Flat"}]

        response = self.client.post(
            "/api/ai/ask/",
            {"message": "Suggest a 2bhk near Nadakkavu"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertEqual(response.json()["answer"], "Recommended property response")
        mocked_matches.assert_called_once()
        mocked_answer.assert_called_once()
