from rest_framework import serializers
from .models import PropertyReview


class ReviewSerializer(serializers.ModelSerializer):
    # ── flat fields so the frontend can always read r.username / r.property_name ──
    username      = serializers.CharField(source='user.username',   read_only=True)
    user_id       = serializers.IntegerField(source='user.id',      read_only=True)
    property_name = serializers.CharField(source='property.name',   read_only=True)
    property_id   = serializers.IntegerField(source='property.id',  read_only=True)
    booking_id    = serializers.SerializerMethodField()

    class Meta:
        model  = PropertyReview
        fields = [
            'id',
            'property_id',
            'property_name',
            'user_id',
            'username',
            'booking_id',
            'rating',
            'comment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields  # all read-only; writes go through ReviewCreateSerializer

    def get_booking_id(self, obj):
        return obj.booking_id  # the FK integer, or None


class ReviewCreateSerializer(serializers.Serializer):
    property_id = serializers.IntegerField()
    booking_id  = serializers.IntegerField(required=False, allow_null=True)
    rating      = serializers.IntegerField(min_value=1, max_value=5)
    comment     = serializers.CharField(required=False, allow_blank=True, default='')