from rest_framework import serializers
from .models import Booking


class BookingCreateSerializer(serializers.Serializer):
    """
    Used to create a Razorpay order.
    token_amount is NOT accepted from user — calculated in the view (5% of property price).
    """
    property_id  = serializers.IntegerField()
    user_name    = serializers.CharField(max_length=100)
    user_phone   = serializers.CharField(max_length=15)
    user_message = serializers.CharField(required=False, allow_blank=True)


class BookingVerifySerializer(serializers.Serializer):
    """Used to verify Razorpay payment after checkout"""
    razorpay_order_id   = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature  = serializers.CharField()


# ── Nested serializers for full detail ───────────────────────────────────────

class BookingUserSerializer(serializers.Serializer):
    """Nested user object — matches what the frontend reads as b.user?.username"""
    id       = serializers.IntegerField()
    username = serializers.CharField()
    email    = serializers.CharField()


class BookingSellerUserSerializer(serializers.Serializer):
    user = BookingUserSerializer()


class BookingPropertySerializer(serializers.Serializer):
    """Nested property object — matches b.property?.name, b.property?.seller?.user?.username"""
    id             = serializers.IntegerField()
    name           = serializers.CharField()
    property_place = serializers.CharField()
    city           = serializers.CharField()
    seller         = BookingSellerUserSerializer()
    property_image = serializers.SerializerMethodField()

    def get_property_image(self, obj):
        try:
            if not obj.property_image or not obj.property_image.name:
                return None
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.property_image.url)
            return f"http://127.0.0.1:8000{obj.property_image.url}"
        except Exception:
            return None


class BookingSerializer(serializers.ModelSerializer):
    """
    Full booking detail.
    Exposes both:
      - nested `user` and `property` objects  (for admin dashboard)
      - flat fields like buyer_username         (for seller dashboard)
    """
    # ── Nested objects (admin dashboard reads these) ──────────────────────────
    user     = BookingUserSerializer(read_only=True)
    property = serializers.SerializerMethodField()

    # ── Flat fields (seller dashboard reads these) ────────────────────────────
    property_name    = serializers.CharField(source='property.name',           read_only=True)
    property_place   = serializers.CharField(source='property.property_place', read_only=True)
    property_image   = serializers.SerializerMethodField()
    buyer_username   = serializers.CharField(source='user.username',            read_only=True)
    buyer_email      = serializers.CharField(source='user.email',               read_only=True)
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model  = Booking
        fields = [
            'id',
            # nested objects
            'user',
            'property',
            # flat fields
            'property_name', 'property_place', 'property_image',
            'buyer_username', 'buyer_email',
            'property_price', 'token_amount', 'remaining_amount',
            'status',
            'user_name', 'user_phone', 'user_message',
            'razorpay_order_id', 'razorpay_payment_id',
            'created_at', 'updated_at', 'expires_at',
        ]
        read_only_fields = fields

    def get_property(self, obj):
        """Return full nested property with seller → user chain"""
        try:
            prop = obj.property
            seller_data = None
            if prop.seller and prop.seller.user:
                seller_data = {
                    "id":    prop.seller.id,
                    "phone": prop.seller.phone,
                    "user": {
                        "id":       prop.seller.user.id,
                        "username": prop.seller.user.username,
                        "email":    prop.seller.user.email,
                    }
                }

            image_url = None
            try:
                if prop.property_image and prop.property_image.name:
                    request = self.context.get('request')
                    image_url = (
                        request.build_absolute_uri(prop.property_image.url)
                        if request
                        else f"http://127.0.0.1:8000{prop.property_image.url}"
                    )
            except Exception:
                pass

            return {
                "id":             prop.id,
                "name":           prop.name,
                "property_place": prop.property_place,
                "city":           prop.city,
                "property_image": image_url,
                "seller":         seller_data,
            }
        except Exception:
            return None

    def get_property_image(self, obj):
        """Flat image URL for seller dashboard"""
        try:
            image = obj.property.property_image
            if not image or not image.name:
                return None
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image.url)
            return f"http://127.0.0.1:8000{image.url}"
        except Exception:
            return None

    def get_remaining_amount(self, obj):
        return str(obj.property_price - obj.token_amount)


class BookingMiniSerializer(serializers.ModelSerializer):
    """Compact version for embedding in property responses"""
    class Meta:
        model  = Booking
        fields = ['id', 'status', 'token_amount', 'property_price', 'created_at']